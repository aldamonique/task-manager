import type { FormEvent } from "react";
import { PencilLine, Plus } from "lucide-react";
import styles from "./task-manager.module.css";

interface TaskFormProps {
  title: string;
  description: string;
  isEditing: boolean;
  isSubmitting: boolean;
  onTitleChange: (title: string) => void;
  onDescriptionChange: (description: string) => void;
  onCancel: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

// One controlled form handles both creation and editing flows.
export function TaskForm({
  title,
  description,
  isEditing,
  isSubmitting,
  onTitleChange,
  onDescriptionChange,
  onCancel,
  onSubmit,
}: TaskFormProps) {
  return (
    <section id="create" className={`${styles.panel} ${styles.formPanel}`}>
      <div className={styles.formHeading}>
        <span className={styles.headingIcon}>
          {isEditing
            ? <PencilLine size={17} aria-hidden="true" />
            : <Plus size={17} aria-hidden="true" />}
        </span>
        <h2>{isEditing ? "Edit Task" : "Create"}</h2>
      </div>

      <form className={styles.form} onSubmit={onSubmit}>
        <div className={styles.field}>
          <label htmlFor="task-title">Title</label>

          <input
            id="task-title"
            type="text"
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder="Enter task title"
            maxLength={100}
            required
            disabled={isSubmitting}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="task-description">Description</label>

          <textarea
            id="task-description"
            value={description}
            onChange={(event) => onDescriptionChange(event.target.value)}
            placeholder="Enter task description"
            maxLength={500}
            disabled={isSubmitting}
          />
        </div>

        <div className={styles.formActions}>
          <button className={styles.submitButton} type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? "Saving..."
              : isEditing
                ? "Save Changes"
                : "Create Task"}
          </button>

          {isEditing && (
            <button className={styles.cancelButton} type="button" onClick={onCancel}>
              Cancel
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
