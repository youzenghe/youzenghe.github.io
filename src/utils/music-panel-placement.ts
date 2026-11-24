export interface PanelRect {
	left: number;
	top: number;
	width: number;
	height: number;
}

export function shouldCloseMusicPanelOnEscape(
	event: Pick<KeyboardEvent, "key" | "defaultPrevented">,
	ownsFocus: boolean,
) {
	return event.key === "Escape" && !event.defaultPrevented && ownsFocus;
}

export function overlapArea(a: PanelRect, b: PanelRect): number {
	return Math.max(0, Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left)) *
		Math.max(0, Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top));
}

export function chooseMusicPanelPosition(
	viewport: {width: number; height: number},
	panel: {width: number; height: number},
	obstacles: PanelRect[],
	anchor: PanelRect,
	reserved: PanelRect[] = [],
) {
	const margin = 16;
	const width = Math.min(panel.width, Math.max(1, viewport.width - margin * 2));
	const height = Math.min(panel.height, Math.max(1, viewport.height - margin * 2));
	const candidates = (height: number, width: number) => {
		const clampX = (x: number) => Math.min(Math.max(margin,viewport.width-width-margin),Math.max(margin,x));
		const clampY = (y: number) => Math.min(Math.max(margin,viewport.height-height-margin),Math.max(margin,y));
		// Keep the panel attached to the entry, not to whichever content card has least overlap.
		return [
			{left:clampX(anchor.left+anchor.width-width),top:clampY(anchor.top-height-12),width,height},
			{left:clampX(anchor.left-width-12),top:clampY(anchor.top+(anchor.height-height)/2),width,height},
			{left:clampX(anchor.left+anchor.width-width),top:clampY(anchor.top+anchor.height+12),width,height},
		];
	};
	const select = (height: number,width: number,compact: boolean) => {
		const rect=candidates(height,width).find(rect=>reserved.every(obstacle=>overlapArea(rect,obstacle)===0));
		return rect ? {...rect,compact,canPlace:true,frosted:obstacles.some(obstacle=>overlapArea(rect,obstacle)>0)} : null;
	};
	if (viewport.width>=640) {
		const full=select(height,width,false);
		if (full && !full.frosted) return full;
	}
	const widths = [...new Set([width, Math.min(width,280), Math.min(width,240)])];
	const heights = [...new Set([156,100,64,48].map(value => Math.min(value,height)))];
	for (const compactHeight of heights) {
		for (const compactWidth of widths) {
			const compact=select(compactHeight,compactWidth,true);
			if (compact) return compact;
		}
	}
	return {left:margin,top:margin,width,height:0,compact:true,canPlace:false,frosted:false};
}
