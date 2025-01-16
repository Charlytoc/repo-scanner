import { useEffect, useRef } from "react";

type TTextareaProps = {
  defaultValue?: string;
  name?: string;
  onChange?: (value: string) => void;
  className?: string;
  label?: string;
  placeholder?: string;
};

export const Textarea = ({
  defaultValue = "",
  name = "textarea",
  onChange = () => {},
  className,
  label,
  placeholder,
}: TTextareaProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  //   adjust the height of the textarea to the content when the user is typing

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [defaultValue]);
  return (
    <div className="w-100">
      <label>{label}</label>
      <textarea
        placeholder={placeholder}
        name={name}
        ref={textareaRef}
        style={{
          overflowY: "auto",
          resize: "none",
          scrollbarWidth: "none",
          width: "100%",
        }}
        onInput={() => {
          if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
          }
        }}
        className={`${className}`}
        defaultValue={defaultValue}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
};
