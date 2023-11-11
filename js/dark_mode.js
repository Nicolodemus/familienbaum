Array.from(document.querySelectorAll("style")).forEach((sheet) => {
	if (sheet.textContent?.includes("-webkit-filter: hue-rotate(180deg) invert(100%) !important;"))
		sheet.parentNode?.removeChild(sheet);
});
