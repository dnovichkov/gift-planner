/**
 * Вспомогательные функции для создания выпадающих списков
 */

/**
 * Создать выпадающий список
 * @param {Object} options - Параметры списка
 * @returns {string} HTML select
 */
export function createSelect({
  label,
  name,
  options = [],
  value = '',
  required = false,
  disabled = false,
  className = '',
  id = '',
}) {
  const selectId = id || `select-${name}`;
  const classes = ['form-select', className].filter(Boolean).join(' ');
  const requiredAttr = required ? 'required' : '';
  const disabledAttr = disabled ? 'disabled' : '';
  const requiredMark = required ? '<span class="form-label__required">*</span>' : '';

  const optionsHtml = options.map(option => {
    const optionValue = typeof option === 'object' ? option.value : option;
    const optionLabel = typeof option === 'object' ? option.label : option;
    const selected = optionValue === value ? 'selected' : '';

    return `<option value="${optionValue}" ${selected}>${optionLabel}</option>`;
  }).join('');

  return `
    <div class="form-group">
      <label for="${selectId}" class="form-label">
        ${label}
        ${requiredMark}
      </label>
      <select
        id="${selectId}"
        name="${name}"
        class="${classes}"
        ${requiredAttr}
        ${disabledAttr}
      >
        ${optionsHtml}
      </select>
    </div>
  `;
}
