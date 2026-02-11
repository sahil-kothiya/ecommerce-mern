# Category Tree Management - Implementation Guide

## 🌳 Overview

A complete hierarchical category management system with **infinite depth support**, drag-and-drop functionality, and real-time tree visualization.

## ✨ Features

### 1. **Infinite Depth Category Tree**

- Create unlimited levels of categories and subcategories
- Visual hierarchy with color-coded levels
- No limit on nesting depth
- Automatic level tracking and management

### 2. **Drag & Drop Interface**

- Drag any category to reorder within its level
- Drop categories to change parent relationships
- Visual feedback during dragging
- Smart parent-child validation
- Prevents circular references

### 3. **Tree Operations**

- **Expand All**: Open all category branches
- **Collapse All**: Close all category branches
- **Add Root Category**: Create top-level categories
- **Add Child**: Add subcategory to any category
- **Edit**: Modify category details
- **Delete**: Remove categories (with safety checks)
- **Toggle Status**: Activate/Deactivate categories
- **Copy ID**: Quick copy category identifier

### 4. **Visual Indicators**

- Level badges (Level 0, Level 1, Level 2, etc.)
- Color-coded by depth:
  - Level 0: Green
  - Level 1: Blue
  - Level 2: Purple
  - Level 3: Pink
  - Level 4: Yellow
  - Level 5+: Indigo
- Child count badges
- Featured star indicator
- Active/Inactive status badges

### 5. **Smart Category Management**

- Real-time stats (Total Categories, Max Depth)
- Parent category dropdown with visual hierarchy
- Image upload support
- SEO fields
- Featured category marking
- Slug auto-generation

## 📂 File Structure

```
frontend/src/pages/admin/categories/
├── CategoryTreeManager.jsx    # Main tree management component
├── CategoryTreeItem.jsx        # Individual tree node component
├── CategoriesList.jsx          # Grid view (legacy)
└── CategoryForm.jsx            # Form component (legacy)
```

```
backend/src/
├── controllers/
│   └── CategoryController.js   # Added bulkReorder() method
├── routes/
│   └── category.routes.js      # Added POST /reorder endpoint
└── models/
    └── Category.js             # sortOrder, level, parentId fields
```

## 🚀 Usage

### Accessing Tree Manager

1. Navigate to `/admin/categories`
2. The tree manager is now the default view
3. Use "Back to List" button to access grid view at `/admin/categories/list`

### Creating Categories

**Root Category:**

1. Click "Add Root Category" button
2. Fill in the form (title, summary, image, etc.)
3. Leave "Parent Category" as "-- Root Category --"
4. Click "Create"

**Child Category:**

1. Click the green "+" button on any category
2. OR click "Add Root Category" and select a parent from dropdown
3. Fill in the form
4. The parent will be pre-selected
5. Click "Create"

### Reordering Categories

**Drag & Drop:**

1. Click and hold the drag handle (⋮⋮⋮ icon)
2. Drag to desired position
3. Release to drop
4. Changes are highlighted with orange border
5. Click "Save Changes" to persist

**Manual Reorder:**

- The tree automatically sorts by `sortOrder` field
- Edit a category to manually set sort order

### Managing Hierarchy

**Moving Categories:**

- Drag a category near another to make them siblings
- Change parent in edit form to restructure tree
- System prevents moving parent into its own children

**Expanding/Collapsing:**

- Click arrow (▶) next to category to expand/collapse
- Use "Expand All" / "Collapse All" for bulk operations

## 🎨 Component API

### CategoryTreeManager

**Props:** None (standalone component)

**State:**

- `categories`: Tree-structured category array
- `flatCategories`: Flat list for parent dropdown
- `expandedCategories`: Set of expanded category IDs
- `hasChanges`: Boolean for unsaved changes

**Methods:**

- `loadCategories()`: Fetch and build tree
- `buildCategoryTree()`: Convert flat list to tree
- `flattenTree()`: Convert tree to flat list
- `handleDragEnd()`: Process drag-drop events
- `handleSaveChanges()`: Bulk update positions
- `toggleExpand()`: Expand/collapse category
- `expandAll()` / `collapseAll()`: Bulk expand/collapse

### CategoryTreeItem

**Props:**

- `category`: Category object
- `depth`: Nesting level (0-based)
- `expandedCategories`: Set of expanded IDs
- `onToggleExpand`: Expand/collapse handler
- `onEdit`: Edit handler
- `onDelete`: Delete handler
- `onAddChild`: Add child handler
- `onToggleStatus`: Status toggle handler

**Features:**

- Sortable drag handle
- Recursive child rendering
- Action button cluster
- Level-based styling

## 🔧 Backend API

### Endpoints

**GET /api/categories**

- Returns flat list of all categories
- Used by tree manager to build hierarchy

**POST /api/categories/reorder**

- Bulk update category positions
- Request body:
  ```json
  {
    "updates": [
      {
        "id": "categoryId",
        "sortOrder": 0,
        "parentId": "parentId or null",
        "level": 0
      }
    ]
  }
  ```

**POST /api/categories**

- Create new category
- Form data with image upload

**PUT /api/categories/:id**

- Update category
- Form data with image upload

**DELETE /api/categories/:id**

- Delete category
- Checks for children and products

## 📊 Database Schema

```javascript
{
  title: String,              // Category name
  slug: String,               // URL-friendly name (auto-generated)
  summary: String,            // Description
  photo: String,              // Image path
  parentId: ObjectId,         // Parent category reference
  level: Number,              // Depth level (0 = root)
  sortOrder: Number,          // Position within parent
  hasChildren: Boolean,       // Has subcategories
  childrenCount: Number,      // Number of children
  status: String,             // 'active' or 'inactive'
  isFeatured: Boolean,        // Featured flag
  isNavigationVisible: Boolean, // Show in navigation
  seoTitle: String,           // SEO meta title
  seoDescription: String      // SEO meta description
}
```

## 🎯 Key Features Explained

### 1. Infinite Depth Support

The tree supports unlimited nesting through:

- Recursive component rendering
- Dynamic level tracking
- Parent-child relationships
- No hardcoded depth limits

```javascript
// Recursive rendering in CategoryTreeItem
{
  hasChildren && isExpanded && (
    <div className="mt-2 space-y-2">
      {category.children.map((child) => (
        <CategoryTreeItem
          key={child._id}
          category={child}
          depth={depth + 1} // Increment depth
          {...props}
        />
      ))}
    </div>
  );
}
```

### 2. Drag & Drop with @dnd-kit

Using modern @dnd-kit library:

- Better performance than react-beautiful-dnd
- Touch device support
- Accessibility features
- Flexible collision detection

```javascript
<DndContext
  sensors={sensors}
  collisionDetection={closestCenter}
  onDragStart={handleDragStart}
  onDragEnd={handleDragEnd}
>
  {/* Tree items */}
</DndContext>
```

### 3. Parent Validation

Prevents circular references:

```javascript
const isDescendant = (parent, childId) => {
  if (parent._id === childId) return true;
  if (parent.children) {
    return parent.children.some((child) => isDescendant(child, childId));
  }
  return false;
};
```

### 4. Bulk Updates

Optimized bulk reordering:

```javascript
const bulkOps = updates.map((update) => ({
  updateOne: {
    filter: { _id: update.id },
    update: {
      $set: {
        sortOrder: update.sortOrder,
        parentId: update.parentId,
        level: update.level,
      },
    },
  },
}));

await Category.bulkWrite(bulkOps);
```

## 🎨 Styling Guide

### Color Scheme by Level

| Level | Background | Border     | Badge      |
| ----- | ---------- | ---------- | ---------- |
| 0     | green-50   | green-200  | green-500  |
| 1     | blue-50    | blue-200   | blue-500   |
| 2     | purple-50  | purple-200 | purple-500 |
| 3     | pink-50    | pink-200   | pink-500   |
| 4     | yellow-50  | yellow-200 | yellow-500 |
| 5+    | indigo-50  | indigo-200 | indigo-500 |

### Button Icons

- 🎯 Drag Handle: Six dots (⋮⋮⋮)
- ▶ Expand: Right arrow
- ➕ Add Child: Plus icon (green)
- ✏️ Edit: Pencil icon (blue)
- 📋 Copy: Document icon (cyan)
- ⭐ Featured: Star icon (yellow/gray)
- 🗑️ Delete: Trash icon (red)
- 🔢 Count: Number in dark badge

## 🚨 Error Handling

### Validation Checks

1. **Delete Protection**
   - Cannot delete category with children
   - Cannot delete category with products
   - Confirmation dialog required

2. **Drag & Drop Validation**
   - Prevents parent from becoming child of descendant
   - Shows warning toast on invalid operation

3. **Form Validation**
   - Title required
   - Image size limit (5MB)
   - Image type validation (JPG, PNG, GIF, WEBP)

## 📱 Responsive Design

- Mobile: Stack vertically, compact buttons
- Tablet: 2-column layout where applicable
- Desktop: Full tree view with all features

## 🔒 Security

- Admin-only access via middleware
- Authentication required for all operations
- CSRF protection on form submissions
- File upload validation

## 📈 Performance

- Lazy loading of category images
- Efficient bulk updates for reordering
- Indexed database queries
- Optimized tree building algorithms

## 🎓 Best Practices

1. **Organize by Purpose**: Group related products
2. **Limit Depth**: While infinite, 3-4 levels is optimal for UX
3. **Use Featured**: Highlight important categories
4. **SEO Fields**: Always fill for better search visibility
5. **Images**: Use consistent aspect ratios
6. **Regular Cleanup**: Remove unused categories

## 🐛 Troubleshooting

### Tree Not Showing

- Check backend API is running
- Verify authentication token
- Check browser console for errors

### Drag Not Working

- Ensure @dnd-kit packages installed
- Check for JavaScript errors
- Try refreshing the page

### Changes Not Saving

- Click "Save Changes" button
- Check network tab for API errors
- Verify admin permissions

## 🔄 Future Enhancements

- [ ] Bulk operations (delete, activate multiple)
- [ ] Category import/export
- [ ] Duplicate category with children
- [ ] Category templates
- [ ] Advanced search/filter
- [ ] Category analytics
- [ ] Drag to reorder across different parents
- [ ] Undo/Redo functionality

## 📚 Resources

- [@dnd-kit Documentation](https://docs.dndkit.com/)
- [React Documentation](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [MongoDB Documentation](https://docs.mongodb.com/)

---

**Created by:** Enterprise E-Commerce Team  
**Version:** 1.0.0  
**Last Updated:** January 2026
