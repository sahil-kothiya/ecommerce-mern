# Category Tree Manager - Quick Reference

## 🎯 Quick Actions

| Action             | How To                                |
| ------------------ | ------------------------------------- |
| Add Root Category  | Click "Add Root Category" button      |
| Add Child Category | Click green "+" on any category       |
| Edit Category      | Click blue pencil icon                |
| Delete Category    | Click red trash icon                  |
| Reorder Categories | Drag using ⋮⋮⋮ handle                 |
| Toggle Status      | Click active/inactive badge           |
| Expand/Collapse    | Click arrow (▶) next to category      |
| Expand All         | Click "Expand All" button             |
| Collapse All       | Click "Collapse All" button           |
| Save Changes       | Click "Save Changes" after reordering |
| Copy Category ID   | Click cyan copy icon                  |

## 🎨 Visual Legend

### Level Colors

- 🟢 **Green** = Level 0 (Root)
- 🔵 **Blue** = Level 1
- 🟣 **Purple** = Level 2
- 🌸 **Pink** = Level 3
- 🟡 **Yellow** = Level 4
- 🔷 **Indigo** = Level 5+

### Status Badges

- 🟢 **Green Badge** = Active
- ⚫ **Gray Badge** = Inactive
- ⭐ **Star** = Featured Category

### Button Icons

| Icon | Meaning                               |
| ---- | ------------------------------------- |
| ⋮⋮⋮  | Drag handle (click & hold to reorder) |
| ▶    | Expand/collapse children              |
| ➕   | Add child category                    |
| ✏️   | Edit category                         |
| 📋   | Copy ID                               |
| ⭐   | Featured indicator                    |
| 🗑️   | Delete                                |
| 🔢   | Number of children                    |

## 🔄 Common Workflows

### Creating a Category Structure

1. Click "Add Root Category"
2. Enter: "Electronics"
3. Click "Create"
4. Click green "+" on "Electronics"
5. Enter: "Smartphones"
6. Click "Create"
7. Repeat for more subcategories

### Reorganizing Categories

1. Find category to move
2. Click and hold drag handle (⋮⋮⋮)
3. Drag to new position
4. Release mouse
5. Click "💾 Save Changes" (appears when changes made)

### Making a Category Featured

1. Click blue pencil (edit) icon
2. Check "Featured Category" checkbox
3. Click "Update"
4. Category now shows ⭐ star

## ⚡ Keyboard Shortcuts

- **Click Arrow**: Expand/Collapse category
- **Click + Hold Drag Handle**: Start dragging
- **Esc**: Close modal/cancel operation

## 📊 Stats Card

Shows at top:

- **Total Categories**: Count of all categories
- **Max Depth**: Deepest nesting level

## ⚠️ Important Notes

### Cannot Delete If:

- ❌ Category has children
- ❌ Category has products

### Cannot Drag If:

- ❌ Trying to move parent into its own child
- ❌ Would create circular reference

### Best Practices:

- ✅ Use 3-4 levels maximum for best UX
- ✅ Add images to all categories
- ✅ Fill SEO fields for better search ranking
- ✅ Use featured sparingly (5-10 categories)
- ✅ Keep category names concise (2-3 words)

## 🔗 Routes

- **Tree Manager**: `/admin/categories`
- **Grid View**: `/admin/categories/list`

## 📝 Form Fields

### Required

- **Title**: Category name

### Optional

- **Parent Category**: Select parent or leave as root
- **Summary**: Brief description
- **Category Image**: Upload image (max 5MB)
- **Status**: Active or Inactive
- **Featured**: Checkbox for featured status
- **SEO Title**: Meta title for search engines
- **SEO Description**: Meta description for search engines

## 🎯 Example Category Structure

```
📁 Electronics (Level 0) ⭐
├── 📁 Smartphones (Level 1)
│   ├── 📄 Android Phones (Level 2)
│   └── 📄 iPhones (Level 2)
├── 📁 Laptops (Level 1)
│   ├── 📄 Gaming Laptops (Level 2)
│   └── 📄 Business Laptops (Level 2)
└── 📁 Accessories (Level 1)
    ├── 📄 Chargers (Level 2)
    └── 📄 Cases (Level 2)
```

## 🚀 Pro Tips

1. **Batch Create**: Create all root categories first, then add children
2. **Visual Hierarchy**: Use images that represent the category level
3. **SEO Optimization**: Include keywords in titles and descriptions
4. **Regular Review**: Check category usage monthly and cleanup unused ones
5. **Mobile First**: Test category navigation on mobile devices

## 🆘 Quick Troubleshooting

| Problem                | Solution                                           |
| ---------------------- | -------------------------------------------------- |
| Can't see categories   | Refresh page, check login status                   |
| Drag not working       | Click and hold for 1 second before dragging        |
| Changes not saving     | Click "Save Changes" button                        |
| Delete button disabled | Category has children or products                  |
| Image won't upload     | Check file size (<5MB) and type (JPG/PNG/GIF/WEBP) |

## 📞 Support

For issues, check browser console (F12) and network tab for error messages.

---

**Navigation**: `/admin/categories` for tree view | `/admin/categories/list` for grid view
