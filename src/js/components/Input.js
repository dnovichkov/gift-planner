/**
 * Вспомогательные функции для создания полей ввода
 */

/**
 * Создать поле ввода
 * @param {Object} options - Параметры поля
 * @returns {string} HTML поля ввода
 */
export function createInput({
  label,
  name,
  type = 'text',
  value = '',
  placeholder = '',
  required = false,
  disabled = false,
  min = '',
  max = '',
  step = '',
  className = '',
  id = '',
}) {
  const inputId = id || `input-${name}`;
  const classes = ['form-input', className].filter(Boolean).join(' ');
  const requiredAttr = required ? 'required' : '';
  const disabledAttr = disabled ? 'disabled' : '';
  const minAttr = min !== '' ? `min="${min}"` : '';
  const maxAttr = max !== '' ? `max="${max}"` : '';
  const stepAttr = step !== '' ? `step="${step}"` : '';
  const requiredMark = required ? '<span class="form-label__required">*</span>' : '';

  return `
    <div class="form-group">
      <label for="${inputId}" class="form-label">
        ${label}
        ${requiredMark}
      </label>
      <input
        type="${type}"
        id="${inputId}"
        name="${name}"
        class="${classes}"
        value="${value}"
        placeholder="${placeholder}"
        ${requiredAttr}
        ${disabledAttr}
        ${minAttr}
        ${maxAttr}
        ${stepAttr}
      />
    </div>
  `;
}

/**
 * Создать текстовое поле (textarea)
 * @param {Object} options - Параметры поля
 * @returns {string} HTML textarea
 */
export function createTextarea({
  label,
  name,
  value = '',
  placeholder = '',
  required = false,
  disabled = false,
  rows = 3,
  className = '',
  id = '',
}) {
  const inputId = id || `textarea-${name}`;
  const classes = ['form-input', 'form-textarea', className].filter(Boolean).join(' ');
  const requiredAttr = required ? 'required' : '';
  const disabledAttr = disabled ? 'disabled' : '';
  const requiredMark = required ? '<span class="form-label__required">*</span>' : '';

  return `
    <div class="form-group">
      <label for="${inputId}" class="form-label">
        ${label}
        ${requiredMark}
      </label>
      <textarea
        id="${inputId}"
        name="${name}"
        class="${classes}"
        placeholder="${placeholder}"
        rows="${rows}"
        ${requiredAttr}
        ${disabledAttr}
      >${value}</textarea>
    </div>
  `;
}
