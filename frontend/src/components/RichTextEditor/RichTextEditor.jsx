import React, { useState, useEffect } from 'react';
import { Button, ButtonGroup, Dropdown } from 'react-bootstrap';
import { 
  TypeBold, TypeItalic, TypeUnderline, Link, 
  ListUl, ListOl, BlockquoteLeft, Image, 
  Code, Justify, JustifyLeft, JustifyCenter, JustifyRight
} from 'react-bootstrap-icons';
import './RichTextEditor.scss';

const RichTextEditor = ({ initialContent = '', onChange }) => {
  const [editorContent, setEditorContent] = useState('');
  const editorRef = React.useRef(null);
  
  useEffect(() => {
    if (initialContent) {
      setEditorContent(initialContent);
    }
  }, [initialContent]);

  const execCommand = (command, value = null) => {
    document.execCommand(command, false, value);
    updateContent();
  };

  const updateContent = () => {
    if (editorRef.current) {
      const content = editorRef.current.innerHTML;
      setEditorContent(content);
      if (onChange) {
        onChange(content);
      }
    }
  };

  const handleInsertLink = () => {
    const url = prompt('Enter URL:');
    if (url) {
      execCommand('createLink', url);
    }
  };

  const handleInsertImage = () => {
    const url = prompt('Enter image URL:');
    if (url) {
      execCommand('insertImage', url);
    }
  };

  const handleHeadingChange = (level) => {
    execCommand('formatBlock', `<h${level}>`);
  };

  const handleAlignmentChange = (alignment) => {
    execCommand(`justify${alignment}`);
  };

  return (
    <div className="rich-text-editor">
      <div className="editor-toolbar">
        <ButtonGroup className="me-2 mb-2">
          <Button variant="outline-secondary" onClick={() => execCommand('bold')}>
            <TypeBold />
          </Button>
          <Button variant="outline-secondary" onClick={() => execCommand('italic')}>
            <TypeItalic />
          </Button>
          <Button variant="outline-secondary" onClick={() => execCommand('underline')}>
            <TypeUnderline />
          </Button>
        </ButtonGroup>
        
        <ButtonGroup className="me-2 mb-2">
          <Button variant="outline-secondary" onClick={() => execCommand('insertUnorderedList')}>
            <ListUl />
          </Button>
          <Button variant="outline-secondary" onClick={() => execCommand('insertOrderedList')}>
            <ListOl />
          </Button>
          <Button variant="outline-secondary" onClick={() => execCommand('formatBlock', '<blockquote>')}>
            <BlockquoteLeft />
          </Button>
        </ButtonGroup>
        
        <ButtonGroup className="me-2 mb-2">
          <Button variant="outline-secondary" onClick={handleInsertLink}>
            <Link />
          </Button>
          <Button variant="outline-secondary" onClick={handleInsertImage}>
            <Image />
          </Button>
          <Button variant="outline-secondary" onClick={() => execCommand('formatBlock', '<pre>')}>
            <Code />
          </Button>
        </ButtonGroup>
        
        <Dropdown as={ButtonGroup} className="me-2 mb-2">
          <Dropdown.Toggle variant="outline-secondary">
            Heading
          </Dropdown.Toggle>
          <Dropdown.Menu>
            <Dropdown.Item onClick={() => handleHeadingChange(1)}>Heading 1</Dropdown.Item>
            <Dropdown.Item onClick={() => handleHeadingChange(2)}>Heading 2</Dropdown.Item>
            <Dropdown.Item onClick={() => handleHeadingChange(3)}>Heading 3</Dropdown.Item>
            <Dropdown.Item onClick={() => handleHeadingChange(4)}>Heading 4</Dropdown.Item>
            <Dropdown.Item onClick={() => execCommand('formatBlock', '<p>')}>Paragraph</Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
        
        <ButtonGroup className="mb-2">
          <Button variant="outline-secondary" onClick={() => handleAlignmentChange('Left')}>
            <JustifyLeft />
          </Button>
          <Button variant="outline-secondary" onClick={() => handleAlignmentChange('Center')}>
            <JustifyCenter />
          </Button>
          <Button variant="outline-secondary" onClick={() => handleAlignmentChange('Right')}>
            <JustifyRight />
          </Button>
          <Button variant="outline-secondary" onClick={() => handleAlignmentChange('')}>
            <Justify />
          </Button>
        </ButtonGroup>
      </div>
      
      <div
        className="editor-content"
        ref={editorRef}
        contentEditable
        dangerouslySetInnerHTML={{ __html: editorContent }}
        onInput={updateContent}
        onBlur={updateContent}
      />
    </div>
  );
};

export default RichTextEditor;