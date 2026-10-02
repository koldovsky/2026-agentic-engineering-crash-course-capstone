import { MatDialogConfig } from '@angular/material/dialog';

/** One width for every create/edit dialog: about 560 px, full width (minus a gutter) on phones. */
export function formDialogConfig<D>(data: D): MatDialogConfig<D> {
  return {
    data,
    width: '560px',
    maxWidth: 'calc(100vw - 32px)',
    panelClass: 'app-form-dialog',
  };
}
