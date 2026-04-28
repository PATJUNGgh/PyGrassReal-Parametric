import { memo } from 'react';

export interface DocsCategoryItemProps {
  title: string;
  description: string;
  items: string[];
  isOpen: boolean;
}

function DocsCategoryItemComponent({ title, description, items, isOpen }: DocsCategoryItemProps) {
  return (
    <details className="pg-docs-item" open={isOpen}>
      <summary>
        <span>{title}</span>
        <small>{description}</small>
      </summary>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </details>
  );
}

const isItemListEqual = (previousItems: string[], nextItems: string[]): boolean => {
  if (previousItems.length !== nextItems.length) {
    return false;
  }

  for (let index = 0; index < previousItems.length; index += 1) {
    if (previousItems[index] !== nextItems[index]) {
      return false;
    }
  }

  return true;
};

export const DocsCategoryItem = memo(
  DocsCategoryItemComponent,
  (previousProps, nextProps) =>
    previousProps.title === nextProps.title &&
    previousProps.description === nextProps.description &&
    previousProps.isOpen === nextProps.isOpen &&
    isItemListEqual(previousProps.items, nextProps.items)
);
