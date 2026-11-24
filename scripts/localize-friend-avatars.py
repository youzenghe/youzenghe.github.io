"""One-time media materialization; normal build and runtime never fetch avatars."""

import hashlib
import io
import json
import re
import subprocess
from pathlib import Path

from PIL import Image

root = Path(__file__).resolve().parents[1]
source = root / "src/data/friends.ts"
text = source.read_text(encoding="utf-8")
target = root / "public/assets/friends"
target.mkdir(parents=True, exist_ok=True)
records = []

for url in dict.fromkeys(re.findall(r'(?m)^\s*imgurl:\s*"(https?://[^"\n]+)"', text)):
    digest = hashlib.sha256(url.encode()).hexdigest()[:16]
    path = target / f"{digest}.webp"
    result = subprocess.run(
        ["curl", "-fLsS", "--max-time", "15", "--max-redirs", "5", "--max-filesize", "5000000", "--proto", "=https", "--proto-redir", "=https", url],
        capture_output=True,
    )
    local = "/assets/friend-avatar.svg"
    outcome = "local-placeholder"
    if result.returncode == 0 and len(result.stdout) <= 5_000_000:
        try:
            with Image.open(io.BytesIO(result.stdout)) as image:
                image.thumbnail((320, 320))
                image.convert("RGB").save(path, "WEBP", quality=85)
            local = f"/assets/friends/{path.name}"
            outcome = "localized"
        except (OSError, ValueError):
            pass
    text = text.replace(f'imgurl: "{url}"', f'imgurl: "{local}"')
    record = {"source_url": url, "local_url": local, "outcome": outcome}
    if outcome == "localized":
        record["sha256"] = hashlib.sha256(path.read_bytes()).hexdigest()
        record["bytes"] = path.stat().st_size
    records.append(record)

old = source.read_text(encoding="utf-8")
import difflib
patch = "*** Begin Patch\n*** Update File: " + str(source) + "\n"
for line in list(difflib.unified_diff(old.splitlines(), text.splitlines(), n=3))[2:]:
    patch += "@@\n" if line.startswith("@@") else line + "\n"
patch += "*** End Patch\n"
subprocess.run(["apply_patch"], input=patch, text=True, check=True)
(root / "verification/avatar-localization.json").write_text(json.dumps(records, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"total": len(records), "localized": sum(item["outcome"] == "localized" for item in records), "placeholders": sum(item["outcome"] != "localized" for item in records)}))
