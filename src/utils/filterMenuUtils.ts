interface FilterMenuInput {
  expanded: () => boolean;
  setExpanded: (expanded: boolean) => void;
  onWideClose: () => void;
}

interface FilterMenu {
  open: () => void;
  close: () => void;
  closeAtWideViewport: (matchesWideViewport: boolean) => void;
}

export const createFilterMenu = (input: FilterMenuInput): FilterMenu => {
  return {
    open: () => {
      input.setExpanded(true);
    },
    // The sheet hands focus back to whatever opened it, so closing only has to unmount the menu.
    close: () => {
      input.setExpanded(false);
    },
    // The desktop rail takes over at this width, so the menu closes without the exit animation.
    closeAtWideViewport: (matchesWideViewport) => {
      if (!matchesWideViewport || !input.expanded()) {
        return;
      }

      input.setExpanded(false);
      input.onWideClose();
    },
  };
};
