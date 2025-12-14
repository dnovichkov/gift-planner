/**
 * Вспомогательные функции для создания карточек
 */

/**
 * Создать карточку
 * @param {Object} options - Параметры карточки
 * @returns {string} HTML карточки
 */
export function createCard({
  title = '',
  subtitle = '',
  content = '',
  footer = '',
  className = '',
  onClick = '',
  id = '',
}) {
  const classes = ['card', className].filter(Boolean).join(' ');
  const idAttr = id ? `id="${id}"` : '';
  const onClickAttr = onClick ? `onclick="${onClick}"` : '';
  const clickableClass = onClick ? 'card--clickable' : '';

  const titleHtml = title ? `<h3 class="card__title">${title}</h3>` : '';
  const subtitleHtml = subtitle ? `<p class="card__subtitle">${subtitle}</p>` : '';
  const footerHtml = footer ? `<div class="card__footer">${footer}</div>` : '';

  return `
    <div class="${classes} ${clickableClass}" ${idAttr} ${onClickAttr}>
      ${title || subtitle ? `
        <div class="card__header">
          ${titleHtml}
          ${subtitleHtml}
        </div>
      ` : ''}
      ${content ? `<div class="card__content">${content}</div>` : ''}
      ${footerHtml}
    </div>
  `;
}

/**
 * Создать компактную карточку для списка
 * @param {Object} options - Параметры
 * @returns {string} HTML карточки
 */
export function createListCard({
  icon = '',
  title,
  subtitle = '',
  badge = '',
  actions = '',
  onClick = '',
  className = '',
  id = '',
}) {
  const classes = ['card', 'card--list', className].filter(Boolean).join(' ');
  const idAttr = id ? `id="${id}"` : '';
  const onClickAttr = onClick ? `onclick="${onClick}"` : '';
  const clickableClass = onClick ? 'card--clickable' : '';

  const iconHtml = icon ? `<div class="card__icon">${icon}</div>` : '';
  const badgeHtml = badge ? `<div class="card__badge">${badge}</div>` : '';
  const subtitleHtml = subtitle ? `<p class="card__subtitle">${subtitle}</p>` : '';
  const actionsHtml = actions ? `<div class="card__actions">${actions}</div>` : '';

  return `
    <div class="${classes} ${clickableClass}" ${idAttr} ${onClickAttr}>
      ${iconHtml}
      <div class="card__body">
        <div class="card__header">
          <h4 class="card__title">${title}</h4>
          ${badgeHtml}
        </div>
        ${subtitleHtml}
      </div>
      ${actionsHtml}
    </div>
  `;
}
