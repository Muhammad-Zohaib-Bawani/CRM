import { useRef, useEffect } from 'react';

const BLOCK_TAGS = [
  { tag: 'P', label: 'Paragraph' },
  { tag: 'H1', label: 'Heading 1' },
  { tag: 'H2', label: 'Heading 2' },
  { tag: 'H3', label: 'Heading 3' },
];

export default function RichTextEditor({ value, onChange }) {
  const editorRef = useRef(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const exec = (cmd, arg = null) => {
    document.execCommand(cmd, false, arg);
    editorRef.current.focus();
    onChange(editorRef.current.innerHTML);
  };

  const handleInput = () => {
    onChange(editorRef.current.innerHTML);
  };

  const insertLink = () => {
    const url = prompt('Enter URL:');
    if (url) exec('createLink', url);
  };

  return (
    <div>
      <div className="editor-toolbar">
        <select
          onChange={(e) => exec('formatBlock', `<${e.target.value}>`)}
          defaultValue="P"
          title="Block format"
        >
          {BLOCK_TAGS.map((b) => (
            <option key={b.tag} value={b.tag}>{b.label}</option>
          ))}
        </select>
        <div className="sep" />
        <button type="button" onClick={() => exec('bold')} title="Bold"><i className="fa-solid fa-bold" /></button>
        <button type="button" onClick={() => exec('italic')} title="Italic"><i className="fa-solid fa-italic" /></button>
        <button type="button" onClick={() => exec('underline')} title="Underline"><i className="fa-solid fa-underline" /></button>
        <button type="button" onClick={() => exec('strikeThrough')} title="Strikethrough"><i className="fa-solid fa-strikethrough" /></button>
        <div className="sep" />
        <button type="button" onClick={() => exec('justifyLeft')} title="Align left"><i className="fa-solid fa-align-left" /></button>
        <button type="button" onClick={() => exec('justifyCenter')} title="Align center"><i className="fa-solid fa-align-center" /></button>
        <button type="button" onClick={() => exec('justifyRight')} title="Align right"><i className="fa-solid fa-align-right" /></button>
        <button type="button" onClick={() => exec('justifyFull')} title="Justify"><i className="fa-solid fa-align-justify" /></button>
        <div className="sep" />
        <button type="button" onClick={() => exec('insertUnorderedList')} title="Bullet list"><i className="fa-solid fa-list-ul" /></button>
        <button type="button" onClick={() => exec('insertOrderedList')} title="Numbered list"><i className="fa-solid fa-list-ol" /></button>
        <div className="sep" />
        <button type="button" onClick={insertLink} title="Insert link"><i className="fa-solid fa-link" /></button>
        <div className="sep" />
        <button type="button" onClick={() => exec('removeFormat')} title="Clear formatting"><i className="fa-solid fa-eraser" /></button>
      </div>
      <div
        ref={editorRef}
        className="editor-area"
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onBlur={handleInput}
        spellCheck
      />
    </div>
  );
}
