import { cx } from '@utils';
import { Index } from 'solid-js';

import { tabForKey } from './utils/tabUtils';

import type { JSX } from 'solid-js';

export interface TabDefinition {
  id: string;
  tabId: string;
  panelId: string;
  label: string;
  count: number;
}

interface TabsProps {
  tabs: readonly TabDefinition[];
  active: string;
  onSelect: (id: string) => void;
  children?: JSX.Element;
}

export const Tabs = (props: TabsProps): JSX.Element => {
  return (
    <div class="flex items-center gap-0.5 border-b border-hairline bg-surface px-2" role="tablist">
      <Index each={props.tabs}>
        {(tab) => {
          return (
            <button
              // Only the active panel is rendered, so pointing at the other one would dangle.
              aria-controls={props.active === tab().id ? tab().panelId : undefined}
              aria-selected={props.active === tab().id}
              class={cx(
                'cursor-pointer border-b-2 px-3 py-2',
                props.active === tab().id
                  ? 'border-accent font-semibold text-text'
                  : 'border-transparent text-text-muted',
              )}
              id={tab().tabId}
              onClick={() => {
                props.onSelect(tab().id);
              }}
              onKeyDown={(event) => {
                const next = tabForKey(props.tabs, props.active, event.key);

                if (next === undefined) {
                  return;
                }

                event.preventDefault();
                props.onSelect(next.id);
                document.getElementById(next.tabId)?.focus();
              }}
              role="tab"
              tabindex={props.active === tab().id ? 0 : -1}
              type="button"
            >
              {tab().label}
              <span class="ml-1.5 opacity-75 tabular-nums">{tab().count}</span>
            </button>
          );
        }}
      </Index>
      {props.children}
    </div>
  );
};
