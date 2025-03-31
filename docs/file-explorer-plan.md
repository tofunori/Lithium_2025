# Plan: Implement File Explorer with Folder Functionality

**Goal:** Implement a file explorer interface for the documents page, allowing users to create and manage folders within each facility to organize files and links hierarchically.

**Phase 1: Backend & Data Structure Changes**

1.  **Modify Data Structure:**
    *   Replace the current flat `documents` array in the facility data (likely stored in or influencing `data/facilities.json` and handled by `api/index.js`) with a new hierarchical structure, perhaps named `filesystem`.
    *   This structure will represent folders containing children (sub-folders, files, links). Each item (folder, file, link) will need a unique ID.
    *   *Example Snippet:*
        ```json
        "filesystem": {
          "root": {
            "id": "root-facilityId", "type": "folder", "name": "/", "children": [
              { "id": "folder-uuid1", "type": "folder", "name": "Reports", "createdAt": "...", "children": [...] },
              { "id": "file-uuid2", "type": "file", "name": "datasheet.pdf", "size": 12345, "uploadedAt": "...", ... },
              { "id": "link-uuid3", "type": "link", "name": "Website", "url": "...", "addedAt": "...", ... }
            ]
          }
        }
        ```
2.  **Update Backend API (`api/index.js`):**
    *   Modify `GET /api/facilities/:id` to return the new `filesystem` structure.
    *   Create **new endpoints** for:
        *   Creating folders (`POST /api/facilities/:id/folders`). Requires `parentId` and `name`.
        *   Renaming/Moving items (`PUT /api/facilities/:id/items/:itemId`). Requires `action` ('rename' or 'move'), `newName` or `newParentId`.
        *   Deleting items (`DELETE /api/facilities/:id/items/:itemId`).
    *   Modify **existing endpoints**:
        *   File Upload (`POST /api/facilities/:id/documents`): Add `parentId` parameter to specify target folder (defaults to root). Consider changing endpoint to `/api/facilities/:id/files`.
        *   Add Link (`POST /api/facilities/:id/links`): Add `parentId` parameter. Standardize input to use `name` instead of `description`.
        *   Get Download URL (`GET /api/facilities/:id/documents/...`): Change to use unique file ID instead of filename (e.g., `GET /api/facilities/:id/files/:fileId/url`).
3.  **Data Migration:** Plan how to convert existing documents/links into the new hierarchical structure (likely starting at the root). This might involve a script or logic within the API on first load.

**Phase 2: Frontend UI & Logic Changes**

1.  **Update HTML (`documents.html`):**
    *   Replace the current `<ul id="documentList">` with a container for a dynamic table or grid view to display folder contents.
    *   Add a breadcrumb navigation element above the content view.
    *   Add buttons for "New Folder", "Upload File", "Add Link".
    *   Plan for context menus or action buttons on items for Rename/Move/Delete.
2.  **Update JavaScript (`js/documents.js`):**
    *   **Data Handling:** Fetch and manage the hierarchical `filesystem` data.
    *   **Rendering:**
        *   Implement `renderFolderContents(folderId)` to display items (folders, files, links) for the current folder in the main view. Use appropriate icons.
        *   Implement `renderBreadcrumbs(folderId)` to update the navigation path.
    *   **State:** Track the `currentFolderId`.
    *   **Event Handling:**
        *   Handle clicks on folders to navigate into them (update `currentFolderId`, re-render).
        *   Handle clicks on breadcrumbs to navigate up.
        *   Handle clicks on files (fetch download URL) and links (open directly).
        *   Implement logic for "New Folder", "Upload", "Add Link" buttons (show forms/modals, include `parentId`, call API).
        *   Implement logic for Rename, Move, Delete actions (call API, update UI).
    *   **"All Facilities" View:** Initially, this view might be simplified, perhaps showing facilities as top-level read-only folders, or disabling folder management actions. Full integration can be a later step.

**Visual Plan (Mermaid Diagram):**

```mermaid
graph TD
    A[User selects Facility] --> B{Fetch Facility Data (inc. Filesystem)};
    B --> C{Render Breadcrumbs (Root)};
    B --> D{Render Folder Contents (Root)};

    subgraph User Actions
        E[Click Folder] --> F{Update Current Folder};
        G[Click Breadcrumb] --> F;
        H[Click New Folder] --> I{Show Name Prompt};
        J[Click Upload/Add Link] --> K{Show Form (inc. Parent Folder)};
        L[Click Rename/Move/Delete] --> M{Show Prompt/Options};
    end

    F --> C;
    F --> D;

    I --> N[Call API: Create Folder];
    K --> O[Call API: Upload/Add Link];
    M --> P[Call API: Rename/Move/Delete];

    N --> Q{Update Local Filesystem};
    O --> Q;
    P --> Q;

    Q --> C;
    Q --> D;

    style B fill:#f9f,stroke:#333,stroke-width:2px
    style N fill:#ccf,stroke:#333,stroke-width:2px
    style O fill:#ccf,stroke:#333,stroke-width:2px
    style P fill:#ccf,stroke:#333,stroke-width:2px
    style Q fill:#f9f,stroke:#333,stroke-width:2px