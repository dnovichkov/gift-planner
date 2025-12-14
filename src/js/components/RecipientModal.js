import { Modal } from './Modal.js';
import { createInput, createTextarea } from './Input.js';
import { createSelect } from './Select.js';
import { createButton } from './Button.js';
import { recipientService } from '../services/RecipientService.js';
import { toast } from './Toast.js';

/**
 * Модальное окно для создания/редактирования одариваемого
 */
export class RecipientModal extends Modal {
  /**
   * @param {string} holidayId - ID праздника
   * @param {Object} recipient - Одариваемый для редактирования (null для создания)
   * @param {Function} onSave - Callback после сохранения
   */
  constructor(holidayId, recipient = null, onSave = null) {
    const isEdit = !!recipient;
    const title = isEdit ? 'Редактировать одариваемого' : 'Новый одариваемый';

    const content = `
      <form id="recipient-form" class="form">
        ${createInput({
          label: 'Имя или название',
          name: 'name',
          value: recipient?.name || '',
          placeholder: 'Иван Сидоров, Семья Петровых...',
          required: true,
          id: 'recipient-name',
        })}

        ${createSelect({
          label: 'Тип',
          name: 'type',
          options: [
            { value: 'adult', label: '👤 Взрослый' },
            { value: 'child', label: '🧒 Ребенок' },
            { value: 'family', label: '👨‍👩‍👦 Семья' },
          ],
          value: recipient?.type || 'adult',
          required: true,
          id: 'recipient-type',
        })}

        ${createTextarea({
          label: 'Примечание',
          name: 'note',
          value: recipient?.note || '',
          placeholder: 'Особые пожелания, размер одежды, интересы...',
          rows: 3,
          id: 'recipient-note',
        })}

        ${createInput({
          label: 'Бюджет на подарки (₽)',
          name: 'budget',
          type: 'number',
          value: recipient?.budget || '',
          placeholder: '0',
          min: '0',
          step: '100',
          id: 'recipient-budget',
        })}

        <div class="form-actions">
          ${createButton({
            text: 'Отмена',
            variant: 'secondary',
            type: 'button',
            id: 'recipient-cancel-btn',
          })}
          ${createButton({
            text: isEdit ? 'Сохранить' : 'Добавить',
            variant: 'primary',
            type: 'submit',
            id: 'recipient-save-btn',
          })}
        </div>
      </form>
    `;

    super({ title, content, closeOnBackdrop: false });

    this.holidayId = holidayId;
    this.recipient = recipient;
    this.onSave = onSave;
    this.isEdit = isEdit;
  }

  onRender() {
    super.onRender();
    this.bindFormEvents();
  }

  bindFormEvents() {
    const form = document.getElementById('recipient-form');
    const cancelBtn = document.getElementById('recipient-cancel-btn');

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleSubmit(form);
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.close();
      });
    }
  }

  async handleSubmit(form) {
    const formData = new FormData(form);
    const data = {
      name: formData.get('name').trim(),
      type: formData.get('type'),
      note: formData.get('note').trim(),
      budget: parseFloat(formData.get('budget')) || 0,
    };

    // Валидация
    if (!data.name) {
      toast.error('Укажите имя одариваемого');
      return;
    }

    try {
      if (this.isEdit) {
        await recipientService.update(this.recipient.id, data);
        toast.success('Одариваемый обновлён');
      } else {
        await recipientService.create(this.holidayId, data);
        toast.success('Одариваемый добавлен');
      }

      if (this.onSave) {
        this.onSave();
      }

      this.close();
    } catch (error) {
      console.error('Ошибка сохранения одариваемого:', error);
      toast.error('Не удалось сохранить данные');
    }
  }
}
