import { Modal } from './Modal.js';
import { createInput, createTextarea } from './Input.js';
import { createButton } from './Button.js';
import { holidayService } from '../services/HolidayService.js';
import { toast } from './Toast.js';

/**
 * Модальное окно для создания/редактирования праздника
 */
export class HolidayModal extends Modal {
  /**
   * @param {Object} holiday - Праздник для редактирования (null для создания)
   * @param {Function} onSave - Callback после сохранения
   */
  constructor(holiday = null, onSave = null) {
    const isEdit = !!holiday;
    const title = isEdit ? 'Редактировать праздник' : 'Новый праздник';

    const content = `
      <form id="holiday-form" class="form">
        ${createInput({
          label: 'Название праздника',
          name: 'name',
          value: holiday?.name || '',
          placeholder: 'Новый год, День рождения...',
          required: true,
          id: 'holiday-name',
        })}

        ${createInput({
          label: 'Дата праздника',
          name: 'date',
          type: 'date',
          value: holiday?.date || '',
          required: true,
          id: 'holiday-date',
        })}

        ${createTextarea({
          label: 'Описание',
          name: 'description',
          value: holiday?.description || '',
          placeholder: 'Добавьте описание или примечания...',
          rows: 3,
          id: 'holiday-description',
        })}

        ${createInput({
          label: 'Максимальный бюджет (₽)',
          name: 'budget',
          type: 'number',
          value: holiday?.budget || '',
          placeholder: '0',
          min: '0',
          step: '100',
          id: 'holiday-budget',
        })}

        <div class="form-actions">
          ${createButton({
            text: 'Отмена',
            variant: 'secondary',
            type: 'button',
            id: 'holiday-cancel-btn',
          })}
          ${createButton({
            text: isEdit ? 'Сохранить' : 'Создать',
            variant: 'primary',
            type: 'submit',
            id: 'holiday-save-btn',
          })}
        </div>
      </form>
    `;

    super({ title, content, closeOnBackdrop: false });

    this.holiday = holiday;
    this.onSave = onSave;
    this.isEdit = isEdit;
  }

  onRender() {
    super.onRender();
    this.bindFormEvents();
  }

  bindFormEvents() {
    const form = document.getElementById('holiday-form');
    const cancelBtn = document.getElementById('holiday-cancel-btn');

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
      date: formData.get('date'),
      description: formData.get('description').trim(),
      budget: parseFloat(formData.get('budget')) || 0,
    };

    // Валидация
    if (!data.name) {
      toast.error('Укажите название праздника');
      return;
    }

    if (!data.date) {
      toast.error('Укажите дату праздника');
      return;
    }

    try {
      if (this.isEdit) {
        await holidayService.update(this.holiday.id, data);
        toast.success('Праздник обновлён');
      } else {
        await holidayService.create(data);
        toast.success('Праздник создан');
      }

      if (this.onSave) {
        this.onSave();
      }

      this.close();
    } catch (error) {
      console.error('Ошибка сохранения праздника:', error);
      toast.error('Не удалось сохранить праздник');
    }
  }
}
