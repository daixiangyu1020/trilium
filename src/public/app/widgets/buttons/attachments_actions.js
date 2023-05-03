import BasicWidget from "../basic_widget.js";
import server from "../../services/server.js";
import dialogService from "../../services/dialog.js";
import toastService from "../../services/toast.js";
import ws from "../../services/ws.js";
import appContext from "../../components/app_context.js";
import openService from "../../services/open.js";

const TPL = `
<div class="dropdown attachment-actions">
    <style>
    .attachment-actions {
        width: 35px;
        height: 35px;
    }
    
    .attachment-actions .dropdown-menu {
        width: 20em;
    }
    
    .attachment-actions .dropdown-item[disabled], .attachment-actions .dropdown-item[disabled]:hover {
        color: var(--muted-text-color) !important;
        background-color: transparent !important;
        pointer-events: none; /* makes it unclickable */
    }
    </style>

    <button type="button" data-toggle="dropdown" aria-haspopup="true" 
        aria-expanded="false" class="icon-action icon-action-always-border bx bx-dots-vertical-rounded"></button>

    <div class="dropdown-menu dropdown-menu-right">
        <a data-trigger-command="openAttachment" class="dropdown-item">Open</a>
        <a data-trigger-command="openAttachmentExternally" class="dropdown-item"
           title="File will be open in an external application and watched for changes. You'll then be able to upload the modified version back to Trilium.">
            Open externally</a>
        <a data-trigger-command="downloadAttachment" class="dropdown-item">Download</a>
        <a data-trigger-command="uploadNewAttachmentRevision" class="dropdown-item">Upload new revision</a>
        <a data-trigger-command="copyAttachmentReferenceToClipboard" class="dropdown-item">Copy reference to clipboard</a>
        <a data-trigger-command="convertAttachmentIntoNote" class="dropdown-item">Convert attachment into note</a>
        <a data-trigger-command="deleteAttachment" class="dropdown-item">Delete attachment</a>
    </div>
</div>`;

export default class AttachmentActionsWidget extends BasicWidget {
    constructor(attachment) {
        super();

        this.attachment = attachment;
    }

    get attachmentId() {
        return this.attachment.attachmentId;
    }

    doRender() {
        this.$widget = $(TPL);
        this.$widget.on('click', '.dropdown-item', () => this.$widget.find("[data-toggle='dropdown']").dropdown('toggle'));
        this.$widget.find("[data-trigger-command='copyAttachmentReferenceToClipboard']").toggle(this.attachment.role === 'image');
    }

    async openAttachmentCommand() {
        await openService.openAttachmentExternally(this.attachmentId, this.attachment.mime);
    }

    async downloadAttachmentCommand() {
        await openService.downloadAttachment(this.attachmentId);
    }

    async copyAttachmentReferenceToClipboardCommand() {
        this.parent.copyAttachmentReferenceToClipboard();
    }

    async openAttachmentExternallyCommand() {
        await openService.openAttachmentExternally(this.attachmentId, this.attachment.mime);
    }

    async deleteAttachmentCommand() {
        if (!await dialogService.confirm(`Are you sure you want to delete attachment '${this.attachment.title}'?`)) {
            return;
        }

        await server.remove(`attachments/${this.attachmentId}`);
        toastService.showMessage(`Attachment '${this.attachment.title}' has been deleted.`);
    }

    async convertAttachmentIntoNoteCommand() {
        if (!await dialogService.confirm(`Are you sure you want to convert attachment '${this.attachment.title}' into a separate note?`)) {
            return;
        }

        const {note: newNote} = await server.post(`attachments/${this.attachmentId}/convert-to-note`)
        toastService.showMessage(`Attachment '${this.attachment.title}' has been converted to note.`);
        await ws.waitForMaxKnownEntityChangeId();
        await appContext.tabManager.getActiveContext().setNote(newNote.noteId);
    }
}
