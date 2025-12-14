/**
 * Вспомогательные функции для создания бэджей (статусных меток)
 */

/**
 * Создать бэдж
 * @param {Object} options - Параметры бэджа
 * @returns {string} HTML бэджа
 */
export function createBadge({
  text,
  variant = 'default', // default, success, error, warning, info
  size = 'md', // sm, md, lg
  className = '',
}) {
  const classes = [
    'badge',
    `badge-${variant}`,
    `badge-${size}`,
    className,
  ].filter(Boolean).join(' ');

  return `<span class="${classes}">${text}</span>`;
}

/**
 * Создать бэдж статуса подарка
 * @param {string} status - Статус (bought, not_bought)
 * @returns {string} HTML бэджа
 */
export function createGiftStatusBadge(status) {
  const statusConfig = {
    bought: { text: 'Куплен', variant: 'success' },
    not_bought: { text: 'Не куплен', variant: 'warning' },
  };

  const config = statusConfig[status] || { text: 'Неизвестно', variant: 'default' };

  return createBadge({
    text: config.text,
    variant: config.variant,
  });
}

/**
 * Создать бэдж приоритета
 * @param {string} priority - Приоритет (high, medium, low)
 * @returns {string} HTML бэджа
 */
export function createPriorityBadge(priority) {
  const priorityConfig = {
    high: { text: 'Высокий', variant: 'error' },
    medium: { text: 'Средний', variant: 'info' },
    low: { text: 'Низкий', variant: 'default' },
  };

  const config = priorityConfig[priority] || { text: 'Средний', variant: 'info' };

  return createBadge({
    text: config.text,
    variant: config.variant,
    size: 'sm',
  });
}

/**
 * Создать бэдж типа одариваемого
 * @param {string} type - Тип (adult, child, family)
 * @returns {string} HTML бэджа
 */
export function createRecipientTypeBadge(type) {
  const typeConfig = {
    adult: { text: '👤 Взрослый', variant: 'default' },
    child: { text: '🧒 Ребенок', variant: 'info' },
    family: { text: '👨‍👩‍👦 Семья', variant: 'success' },
  };

  const config = typeConfig[type] || { text: type, variant: 'default' };

  return createBadge({
    text: config.text,
    variant: config.variant,
    size: 'sm',
  });
}
