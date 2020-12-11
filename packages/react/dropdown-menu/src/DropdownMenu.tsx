import * as React from 'react';
import {
  composeEventHandlers,
  createContext,
  extendComponent,
  useComposedRefs,
  useControlledState,
  useId,
} from '@interop-ui/react-utils';
import { forwardRefWithAs } from '@interop-ui/react-polymorphic';
import { getPartDataAttrObj } from '@interop-ui/utils';
import * as MenuPrimitive from '@interop-ui/react-menu';

/* -------------------------------------------------------------------------------------------------
 * DropdownMenu
 * -----------------------------------------------------------------------------------------------*/

const DROPDOWN_MENU_NAME = 'DropdownMenu';

type DropdownMenuContextValue = {
  triggerRef: React.RefObject<HTMLButtonElement>;
  id: string;
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean | undefined>>;
};

const [DropdownMenuContext, useDropdownMenuContext] = createContext<DropdownMenuContextValue>(
  DROPDOWN_MENU_NAME + 'Context',
  DROPDOWN_MENU_NAME
);

type DropdownMenuOwnProps = {
  id?: string;
  isOpen?: boolean;
  defaultIsOpen?: boolean;
  onIsOpenChange?: (isOpen: boolean) => void;
};

const DropdownMenu: React.FC<DropdownMenuOwnProps> = (props) => {
  const { children, id: idProp, isOpen: isOpenProp, defaultIsOpen, onIsOpenChange } = props;
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const generatedId = useId();
  const id = idProp || `dropdown-menu-${generatedId}`;
  const [isOpen = false, setIsOpen] = useControlledState({
    prop: isOpenProp,
    defaultProp: defaultIsOpen,
    onChange: onIsOpenChange,
  });
  const context = React.useMemo(() => ({ triggerRef, id, isOpen, setIsOpen }), [
    id,
    isOpen,
    setIsOpen,
  ]);

  return <DropdownMenuContext.Provider value={context}>{children}</DropdownMenuContext.Provider>;
};

DropdownMenu.displayName = DROPDOWN_MENU_NAME;

/* -------------------------------------------------------------------------------------------------
 * DropdownMenuTrigger
 * -----------------------------------------------------------------------------------------------*/

const TRIGGER_NAME = 'DropdownMenuTrigger';
const TRIGGER_DEFAULT_TAG = 'button';

const DropdownMenuTrigger = forwardRefWithAs<typeof TRIGGER_DEFAULT_TAG>((props, forwardedRef) => {
  const { as: Comp = TRIGGER_DEFAULT_TAG, onClick, ...triggerProps } = props;
  const context = useDropdownMenuContext(TRIGGER_NAME);
  const composedTriggerRef = useComposedRefs(forwardedRef, context.triggerRef);

  return (
    <Comp
      {...getPartDataAttrObj(TRIGGER_NAME)}
      ref={composedTriggerRef}
      type="button"
      aria-haspopup="menu"
      aria-expanded={context.isOpen ? true : undefined}
      aria-controls={context.isOpen ? context.id : undefined}
      {...triggerProps}
      onMouseDown={composeEventHandlers(triggerProps.onMouseDown, (event) => {
        // only call handler if it's the left button (mousedown gets triggered by all mouse buttons)
        // but not when the control key is pressed (avoiding MacOS right click)
        if (event.button === 0 && event.ctrlKey === false) {
          context.setIsOpen((prevOpen) => !prevOpen);
        }
      })}
      onKeyDown={composeEventHandlers(triggerProps.onKeyDown, (event: React.KeyboardEvent) => {
        if (event.key === ' ' || event.key === 'ArrowUp' || event.key === 'ArrowDown') {
          event.preventDefault();
          context.setIsOpen(true);
        }
      })}
    />
  );
});

DropdownMenuTrigger.displayName = TRIGGER_NAME;

/* -------------------------------------------------------------------------------------------------
 * DropdownMenuPopper
 * -----------------------------------------------------------------------------------------------*/

const POPPER_NAME = 'DropdownMenuPopper';

type DropdownMenuPopperOwnProps = {
  anchorRef?: React.ComponentProps<typeof MenuPrimitive.Root>['anchorRef'];
  trapFocus: never;
  onCloseAutoFocus: never;
  onOpenAutoFocus: never;
  onDismiss: never;
};

const DropdownMenuPopper = forwardRefWithAs<typeof MenuPrimitive.Root, DropdownMenuPopperOwnProps>(
  (props, forwardedRef) => {
    const {
      anchorRef,
      disableOutsidePointerEvents = true,
      onPointerDownOutside,
      onInteractOutside,
      disableOutsideScroll = true,
      shouldPortal = true,
      ...popperProps
    } = props;
    const context = useDropdownMenuContext(POPPER_NAME);
    const [skipCloseAutoFocus, setSkipCloseAutoFocus] = React.useState(false);
    return (
      <MenuPrimitive.Root
        ref={forwardedRef}
        {...popperProps}
        {...getPartDataAttrObj(POPPER_NAME)}
        id={context.id}
        style={{
          ...popperProps.style,
          // re-namespace exposed popper custom property
          ['--radix-dropdown-menu-popper-transform-origin' as any]: 'var(--radix-popper-transform-origin)',
        }}
        isOpen={context.isOpen}
        onIsOpenChange={context.setIsOpen}
        anchorRef={anchorRef || context.triggerRef}
        trapFocus
        onCloseAutoFocus={(event) => {
          if (skipCloseAutoFocus) {
            event.preventDefault();
          } else {
            context.triggerRef.current?.focus();
          }
        }}
        disableOutsidePointerEvents={disableOutsidePointerEvents}
        onPointerDownOutside={(event) => {
          const wasTrigger = event.target === context.triggerRef.current;

          // skip autofocus on close if clicking outside is allowed and it happened
          setSkipCloseAutoFocus(!disableOutsidePointerEvents);

          // prevent dismissing when clicking the trigger
          // as it's already setup to close, otherwise it would close and immediately open.
          if (wasTrigger) {
            event.preventDefault();
          } else {
            onInteractOutside?.(event);
          }

          if (event.defaultPrevented) {
            // reset this because the event was prevented
            setSkipCloseAutoFocus(false);
          }
        }}
        onInteractOutside={onInteractOutside}
        disableOutsideScroll={disableOutsideScroll}
        shouldPortal={shouldPortal}
        onDismiss={() => context.setIsOpen(false)}
      />
    );
  }
);

DropdownMenuPopper.displayName = POPPER_NAME;

/* -----------------------------------------------------------------------------------------------*/

const DropdownMenuGroup = extendComponent(MenuPrimitive.Group, 'DropdownMenuGroup');
const DropdownMenuLabel = extendComponent(MenuPrimitive.Label, 'DropdownMenuLabel');
const DropdownMenuItem = extendComponent(MenuPrimitive.Item, 'DropdownMenuItem');
const DropdownMenuCheckboxItem = extendComponent(
  MenuPrimitive.CheckboxItem,
  'DropdownMenuCheckboxItem'
);
const DropdownMenuRadioGroup = extendComponent(MenuPrimitive.RadioGroup, 'DropdownMenuRadioGroup');
const DropdownMenuRadioItem = extendComponent(MenuPrimitive.RadioItem, 'DropdownMenuRadioItem');
const DropdownMenuItemIndicator = extendComponent(
  MenuPrimitive.ItemIndicator,
  'DropdownMenuItemIndicator'
);
const DropdownMenuSeparator = extendComponent(MenuPrimitive.Separator, 'DropdownMenuSeparator');
const DropdownMenuArrow = extendComponent(MenuPrimitive.Arrow, 'DropdownMenuArrow');

/* -----------------------------------------------------------------------------------------------*/

const Root = DropdownMenu;
const Trigger = DropdownMenuTrigger;
const Popper = DropdownMenuPopper;
const MenuGroup = DropdownMenuGroup;
const MenuLabel = DropdownMenuLabel;
const MenuItem = DropdownMenuItem;
const MenuCheckboxItem = DropdownMenuCheckboxItem;
const MenuRadioGroup = DropdownMenuRadioGroup;
const MenuRadioItem = DropdownMenuRadioItem;
const MenuItemIndicator = DropdownMenuItemIndicator;
const MenuSeparator = DropdownMenuSeparator;
const Arrow = DropdownMenuArrow;

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuPopper,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuItemIndicator,
  DropdownMenuSeparator,
  DropdownMenuArrow,
  //
  Root,
  Trigger,
  Popper,
  MenuGroup,
  MenuLabel,
  MenuItem,
  MenuCheckboxItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuItemIndicator,
  MenuSeparator,
  Arrow,
};