/**
 * Вспомогательные функции для создания прогресс-баров
 */

/**
 * Создать прогресс-бар
 * @param {Object} options - Параметры прогресс-бара
 * @returns {string} HTML прогресс-бара
 */
export function createProgressBar({
  percent,
  showLabel = true,
  size = 'md', // sm, md, lg
  variant = 'default', // default, success, warning, error
  className = '',
}) {
  const safePercent = Math.min(100, Math.max(0, percent));
  const classes = [
    'progress-bar',
    `progress-bar-${size}`,
    `progress-bar-${variant}`,
    className,
  ].filter(Boolean).join(' ');

  const labelHtml = showLabel
    ? `<span class="progress-bar__label">${safePercent}%</span>`
    : '';

  return `
    <div class="${classes}">
      <div
        class="progress-bar__fill"
        style="width: ${safePercent}%"
        role="progressbar"
        aria-valuenow="${safePercent}"
        aria-valuemin="0"
        aria-valuemax="100"
      ></div>
      ${labelHtml}
    </div>
  `;
}

/**
 * Создать прогресс-бар с автоматическим вариантом цвета
 * @param {Object} options - Параметры
 * @returns {string} HTML прогресс-бара
 */
export function createSmartProgressBar({
  percent,
  showLabel = true,
  size = 'md',
  className = '',
}) {
  let variant = 'default';

  if (percent >= 100) {
    variant = 'success';
  } else if (percent >= 50) {
    variant = 'default';
  } else if (percent >= 25) {
    variant = 'warning';
  } else {
    variant = 'error';
  }

  return createProgressBar({
    percent,
    showLabel,
    size,
    variant,
    className,
  });
}
