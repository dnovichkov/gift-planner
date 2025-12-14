import { Modal } from './Modal.js';
import { createInput, createTextarea } from './Input.js';
import { createSelect } from './Select.js';
import { createCheckbox } from './Checkbox.js';
import { createButton } from './Button.js';
import { giftService } from '../services/GiftService.js';
import { toast } from './Toast.js';

/**
 * Модальное окно для создания/редактирования подарка
 */
export class GiftModal extends Modal {
  /**
   * @param {string} recipientId - ID одариваемого
   * @param {string} holidayId - ID праздника
   * @param {Object} gift - Подарок для редактирования (null для создания)
   * @param {Function} onSave - Callback после сохранения
   */
  constructor(recipientId, holidayId, gift = null, onSave = null) {
    const isEdit = !!gift;
    const title = isEdit ? 'Редактировать подарок' : 'Новый подарок';

    const content = `
      <form id="gift-form" class="form">
        ${createInput({
          label: 'Название подарка',
          name: 'name',
          value: gift?.name || '',
          placeholder: 'Книга, Духи, Носки...',
          required: true,
          id: 'gift-name',
        })}

        ${createTextarea({
          label: 'Описание',
          name: 'description',
          value: gift?.description || '',
          placeholder: 'Детали, ссылка на товар...',
          rows: 3,
          id: 'gift-description',
        })}

        ${createInput({
          label: 'Примерная стоимость (₽)',
          name: 'cost',
          type: 'number',
          value: gift?.cost || '',
          placeholder: '0',
          min: '0',
          step: '10',
          id: 'gift-cost',
        })}

        ${createSelect({
          label: 'Приоритет',
          name: 'priority',
          options: [
            { value: 'high', label: '🔴 Высокий' },
            { value: 'medium', label: '🟡 Средний' },
            { value: 'low', label: '🟢 Низкий' },
          ],
          value: gift?.priority || 'medium',
          id: 'gift-priority',
        })}

        ${createCheckbox({
          label: 'Подарок уже куплен',
          name: 'bought',
          checked: gift?.status === 'bought',
          id: 'gift-bought',
        })}

        <div class="form-actions">
          ${createButton({
            text: 'Отмена',
            variant: 'secondary',
            type: 'button',
            id: 'gift-cancel-btn',
          })}
          ${createButton({
            text: isEdit ? 'Сохранить' : 'Добавить',
            variant: 'primary',
            type: 'submit',
            id: 'gift-save-btn',
          })}
        </div>
      </form>
    `;

    super({ title, content, closeOnBackdrop: false });

    this.recipientId = recipientId;
    this.holidayId = holidayId;
    this.gift = gift;
    this.onSave = onSave;
    this.isEdit = isEdit;
  }

  onRender() {
    super.onRender();
    this.bindFormEvents();
  }

  bindFormEvents() {
    const form = document.getElementById('gift-form');
    const cancelBtn = document.getElementById('gift-cancel-btn');

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
      description: formData.get('description').trim(),
      cost: parseFloat(formData.get('cost')) || 0,
      priority: formData.get('priority'),
      status: formData.get('bought') ? 'bought' : 'not_bought',
    };

    // Валидация
    if (!data.name) {
      toast.error('Укажите название подарка');
      return;
    }

    try {
      if (this.isEdit) {
        await giftService.update(this.gift.id, data);
        toast.success('Подарок обновлён');
      } else {
        await giftService.create(this.recipientId, this.holidayId, data);
        toast.success('Подарок добавлен');
      }

      if (this.onSave) {
        this.onSave();
      }

      this.close();
    } catch (error) {
      console.error('Ошибка сохранения подарка:', error);
      toast.error('Не удалось сохранить подарок');
    }
  }
}
