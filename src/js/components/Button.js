/**
 * Вспомогательные функции для создания кнопок
 */

/**
 * Создать кнопку
 * @param {Object} options - Параметры кнопки
 * @returns {string} HTML кнопки
 */
export function createButton({
  text,
  variant = 'primary', // primary, secondary, danger, ghost
  size = 'md', // sm, md, lg
  icon = '',
  onClick = '',
  disabled = false,
  type = 'button',
  className = '',
  id = '',
}) {
  const classes = [
    'btn',
    `btn-${variant}`,
    `btn-${size}`,
    className,
  ].filter(Boolean).join(' ');

  const iconHtml = icon ? `<span class="btn__icon">${icon}</span>` : '';
  const disabledAttr = disabled ? 'disabled' : '';
  const idAttr = id ? `id="${id}"` : '';
  const onClickAttr = onClick ? `onclick="${onClick}"` : '';

  return `
    <button
      type="${type}"
      class="${classes}"
      ${disabledAttr}
      ${idAttr}
      ${onClickAttr}
    >
      ${iconHtml}
      <span class="btn__text">${text}</span>
    </button>
  `;
}

/**
 * Создать иконочную кнопку
 * @param {Object} options - Параметры кнопки
 * @returns {string} HTML кнопки
 */
export function createIconButton({
  icon,
  title,
  variant = 'ghost',
  size = 'md',
  onClick = '',
  className = '',
  id = '',
}) {
  const classes = [
    'btn',
    'btn-icon',
    `btn-${variant}`,
    `btn-${size}`,
    className,
  ].filter(Boolean).join(' ');

  const idAttr = id ? `id="${id}"` : '';
  const onClickAttr = onClick ? `onclick="${onClick}"` : '';

  return `
    <button
      type="button"
      class="${classes}"
      title="${title}"
      aria-label="${title}"
      ${idAttr}
      ${onClickAttr}
    >
      ${icon}
    </button>
  `;
}
