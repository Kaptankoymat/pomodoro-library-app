export const libraryTheme = {
  current: {
    panel: "bg-[#fbf0df] text-[#2f1d12] border-[#c7a77f]",
    panelMuted: "bg-[#ead8bd] text-[#3b281b] border-[#d1b48d]",
    darkPanel: "bg-[#2c1a10] text-[#fff1d8] border-[#9b6a3c]",
    primaryButton: "bg-[#6f3f22] text-amber-50 hover:bg-[#83502c]",
    secondaryButton:
      "border border-[#c7a77f] bg-[#f2dfc3] text-[#4a2f1d] hover:bg-[#ead0aa]",
    focusRing: "focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400",
  },
  legacy: {
    panel: "bg-[#e3d7c1] text-[#3e3225] border-[#c5b49e]",
    darkPanel: "bg-stone-900 text-stone-100 border-amber-200/15",
    primaryButton: "bg-[#d2c0a1] text-[#3e3225] hover:bg-[#c3ae8a]",
  },
} as const;
