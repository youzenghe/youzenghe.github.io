import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const directory = path.join(root, "public/assets/vendor");
await fs.mkdir(directory, { recursive: true });
await fs.copyFile(path.join(root, "node_modules/mermaid/dist/mermaid.min.js"), path.join(directory, "mermaid.min.js"));
await fs.copyFile(path.join(root, "node_modules/mermaid/LICENSE"), path.join(directory, "mermaid.LICENSE"));
