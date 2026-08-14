import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { createFilterMenu } from './filterMenuUtils';

const filterMenuFor = (expanded: boolean) => {
  const setExpanded = vi.fn();
  const onWideClose = vi.fn();

  const menu = createFilterMenu({
    expanded: () => {
      return expanded;
    },
    setExpanded,
    onWideClose,
  });

  return {
    menu,
    onWideClose,
    setExpanded,
  };
};

describe('createFilterMenu', () => {
  it('opens the menu', () => {
    const { menu, setExpanded } = filterMenuFor(false);

    menu.open();

    expect(setExpanded).toHaveBeenCalledWith(true);
  });

  it('closes the menu, leaving the sheet to hand focus back', () => {
    const { menu, setExpanded } = filterMenuFor(true);

    menu.close();

    expect(setExpanded).toHaveBeenCalledWith(false);
  });

  it('closes an open menu once the viewport becomes wide', () => {
    const {
      menu,
      onWideClose,
      setExpanded,
    } = filterMenuFor(true);

    menu.closeAtWideViewport(true);

    expect(setExpanded).toHaveBeenCalledWith(false);
    expect(onWideClose).toHaveBeenCalledTimes(1);
  });

  it('leaves a closed menu alone at a wide viewport', () => {
    const {
      menu,
      onWideClose,
      setExpanded,
    } = filterMenuFor(false);

    menu.closeAtWideViewport(true);

    expect(setExpanded).not.toHaveBeenCalled();
    expect(onWideClose).not.toHaveBeenCalled();
  });

  it('leaves an open menu alone while the viewport is still narrow', () => {
    const {
      menu,
      onWideClose,
      setExpanded,
    } = filterMenuFor(true);

    menu.closeAtWideViewport(false);

    expect(setExpanded).not.toHaveBeenCalled();
    expect(onWideClose).not.toHaveBeenCalled();
  });
});
