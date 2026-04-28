import React from 'react';
import { Search, Pencil, Trash2, Dices } from 'lucide-react';
import { useLanguage, localizeText } from '../../../i18n/language';
import { CHAT_COMPOSER_UI, CHAT_LIMITS, type PresetItem } from '../../data/chatData';
import './ChatComposer.css';

interface PresetsModalProps {
  view: 'list' | 'new';
  onClose: () => void;
  onSetView: (view: 'list' | 'new') => void;
  searchText: string;
  onSearchChange: (text: string) => void;
  filteredPresets: PresetItem[];
  editingId: string | null;
  pendingDeleteId: string | null;
  onEdit: (preset: PresetItem) => void;
  onDelete: (id: string) => void;
  newContent: string;
  onNewContentChange: (text: string) => void;
  newTrigger: string;
  onNewTriggerChange: (text: string) => void;
  onRandom: () => void;
  onSave: () => void;
}

interface PresetListViewProps {
  searchText: string;
  onSearchChange: (text: string) => void;
  filteredPresets: PresetItem[];
  pendingDeleteId: string | null;
  onEdit: (preset: PresetItem) => void;
  onDelete: (id: string) => void;
  onAddClick: () => void;
}

const PresetListView = React.memo(({
  searchText, onSearchChange, filteredPresets, pendingDeleteId, onEdit, onDelete, onAddClick
}: PresetListViewProps) => {
  const { language } = useLanguage();
  
  return (
    <>
      <div className="preset-modal-tools">
        <label className="preset-search-field">
          <Search size={16} strokeWidth={2} />
          <input 
            type="text" 
            value={searchText} 
            onChange={(e) => onSearchChange(e.target.value)} 
            placeholder={localizeText(language, CHAT_COMPOSER_UI.searchPrompts)} 
            maxLength={100} 
          />
        </label>
        <button className="preset-add-button" onClick={onAddClick} type="button">
          + {localizeText(language, CHAT_COMPOSER_UI.addPrompts)}
        </button>
      </div>
      
      <div className="preset-table-container">
        <div className="preset-table-header">
          <span>{localizeText(language, CHAT_COMPOSER_UI.triggerWord)}</span>
          <span>{localizeText(language, CHAT_COMPOSER_UI.content)}</span>
        </div>
        
        <div className="preset-table-body">
          {filteredPresets.length > 0 ? (
            filteredPresets.map((preset) => (
              <div className="preset-table-row" key={preset.id}>
                <span className="preset-trigger-word">
                  <span className="preset-trigger-tag">{preset.triggerWord}</span>
                </span>
                <span className="preset-content">{localizeText(language, preset.content)}</span>
                
                <div className={`preset-row-actions ${pendingDeleteId === preset.id ? 'is-active' : ''}`}>
                  <button className="preset-row-action-btn" onClick={() => onEdit(preset)} type="button">
                    <Pencil size={14} strokeWidth={2.1} />
                  </button>
                  <button 
                    className={`preset-row-action-btn preset-row-action-delete ${pendingDeleteId === preset.id ? 'is-confirming' : ''}`} 
                    onClick={() => onDelete(preset.id)} 
                    type="button"
                  >
                    <Trash2 size={14} strokeWidth={2.1} />
                    {pendingDeleteId === preset.id && <span>{localizeText(language, CHAT_COMPOSER_UI.confirm)}</span>}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="preset-table-empty">{localizeText(language, CHAT_COMPOSER_UI.noSavedPrompts)}</div>
          )}
        </div>
      </div>
    </>
  );
});

PresetListView.displayName = 'PresetListView';

interface PresetFormViewProps {
  editingId: string | null;
  newContent: string;
  onNewContentChange: (text: string) => void;
  newTrigger: string;
  onNewTriggerChange: (text: string) => void;
  onRandom: () => void;
  onSave: () => void;
  onCancel: () => void;
}

const PresetFormView = React.memo(({
  editingId, newContent, onNewContentChange, newTrigger, onNewTriggerChange, onRandom, onSave, onCancel
}: PresetFormViewProps) => {
  const { language } = useLanguage();
  const isSubmitDisabled = !newContent.trim() || !newTrigger.trim();

  return (
    <div className="preset-create-panel">
      <p className="preset-create-subtitle">{localizeText(language, CHAT_COMPOSER_UI.createSubtitle)}</p>
      
      <button className="preset-random-button" onClick={onRandom} type="button">
        <Dices size={15} strokeWidth={2.2} /> 
        <span>{localizeText(language, CHAT_COMPOSER_UI.randomOne)}</span>
      </button>
      
      <div className="preset-create-form">
        <label className="preset-form-label">{localizeText(language, CHAT_COMPOSER_UI.contentLabel)}</label>
        <textarea 
          className="preset-content-input" 
          value={newContent} 
          onChange={(e) => onNewContentChange(e.target.value)} 
          placeholder={localizeText(language, CHAT_COMPOSER_UI.contentPlaceholder)} 
          maxLength={CHAT_LIMITS.PRESET_CONTENT_MAX_LENGTH} 
        />
        
        <label className="preset-form-label">{localizeText(language, CHAT_COMPOSER_UI.triggerLabel)}</label>
        <input 
          className="preset-trigger-input" 
          type="text" 
          value={newTrigger} 
          onChange={(e) => onNewTriggerChange(e.target.value)} 
          placeholder={localizeText(language, CHAT_COMPOSER_UI.triggerPlaceholder)} 
          maxLength={CHAT_LIMITS.TRIGGER_WORD_MAX_LENGTH} 
        />
      </div>
      
      <div className="preset-create-actions">
        <button className="preset-action-btn preset-action-cancel" onClick={onCancel} type="button">
          {localizeText(language, CHAT_COMPOSER_UI.cancel)}
        </button>
        <button className="preset-action-btn preset-action-new" onClick={onSave} disabled={isSubmitDisabled} type="button">
          {editingId ? localizeText(language, CHAT_COMPOSER_UI.save) : localizeText(language, CHAT_COMPOSER_UI.new)}
        </button>
      </div>
    </div>
  );
});

PresetFormView.displayName = 'PresetFormView';

export const PresetsModal = React.memo(({
  view, onClose, onSetView, searchText, onSearchChange,
  filteredPresets, editingId, pendingDeleteId, onEdit, onDelete,
  newContent, onNewContentChange, newTrigger, onNewTriggerChange, onRandom, onSave
}: PresetsModalProps) => {
  const { language } = useLanguage();
  
  const modalTitle = view === 'list' 
    ? localizeText(language, CHAT_COMPOSER_UI.presets) 
    : localizeText(language, CHAT_COMPOSER_UI.newPrompts);

  return (
    <div className="preset-modal-overlay" role="presentation" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="preset-modal" role="dialog" aria-modal="true">
        <div className="preset-modal-header">
          <h2>{modalTitle}</h2>
          <button className="preset-modal-close-btn" onClick={onClose} type="button">
            <span className="preset-modal-close-glyph" aria-hidden="true">×</span>
          </button>
        </div>

        {view === 'list' ? (
          <PresetListView
            searchText={searchText}
            onSearchChange={onSearchChange}
            filteredPresets={filteredPresets}
            pendingDeleteId={pendingDeleteId}
            onEdit={onEdit}
            onDelete={onDelete}
            onAddClick={() => onSetView('new')}
          />
        ) : (
          <PresetFormView
            editingId={editingId}
            newContent={newContent}
            onNewContentChange={onNewContentChange}
            newTrigger={newTrigger}
            onNewTriggerChange={onNewTriggerChange}
            onRandom={onRandom}
            onSave={onSave}
            onCancel={() => onSetView('list')}
          />
        )}
      </div>
    </div>
  );
});

PresetsModal.displayName = 'PresetsModal';
