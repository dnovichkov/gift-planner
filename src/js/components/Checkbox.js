/**
 * Вспомогательные функции для создания чекбоксов
 */

/**
 * Создать чекбокс
 * @param {Object} options - Параметры чекбокса
 * @returns {string} HTML чекбокса
 */
export function createCheckbox({
  label,
  name,
  value = '',
  checked = false,
  disabled = false,
  onChange = '',
  className = '',
  id = '',
}) {
  const checkboxId = id || `checkbox-${name}`;
  const classes = ['form-checkbox', className].filter(Boolean).join(' ');
  const checkedAttr = checked ? 'checked' : '';
  const disabledAttr = disabled ? 'disabled' : '';
  const onChangeAttr = onChange ? `onchange="${onChange}"` : '';

  return `
    <div class="form-checkbox-wrapper">
      <input
        type="checkbox"
        id="${checkboxId}"
        name="${name}"
        value="${value}"
        class="${classes}"
        ${checkedAttr}
        ${disabledAttr}
        ${onChangeAttr}
      />
      <label for="${checkboxId}" class="form-checkbox-label">
        ${label}
      </label>
    </div>
  `;
}

/**
 * Создать переключатель (switch)
 * @param {Object} options - Параметры переключателя
 * @returns {string} HTML переключателя
 */
export function createSwitch({
  label,
  name,
  checked = false,
  disabled = false,
  onChange = '',
  className = '',
  id = '',
}) {
  const switchId = id || `switch-${name}`;
  const classes = ['form-switch', className].filter(Boolean).join(' ');
  const checkedAttr = checked ? 'checked' : '';
  const disabledAttr = disabled ? 'disabled' : '';
  const onChangeAttr = onChange ? `onchange="${onChange}"` : '';

  return `
    <div class="form-switch-wrapper">
      <input
        type="checkbox"
        id="${switchId}"
        name="${name}"
        class="${classes}"
        ${checkedAttr}
        ${disabledAttr}
        ${onChangeAttr}
      />
      <label for="${switchId}" class="form-switch-label">
        <span class="form-switch-toggle"></span>
        <span class="form-switch-text">${label}</span>
      </label>
    </div>
  `;
}
