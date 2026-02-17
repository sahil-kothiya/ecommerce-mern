import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { API_CONFIG } from '../../../constants';
import notify from '../../../utils/notify';

const ChildDropSection = ({ categoryId, depth }) => {
    const { isOver, setNodeRef } = useDroppable({
        id: `child-drop-${categoryId}`,
    });

    return (
        <div
            ref={setNodeRef}
            style={{ marginLeft: `${(depth + 1) * 40}px` }}
            className={`mt-3 rounded-xl border-2 border-dashed px-4 py-5 text-center text-sm font-semibold transition-colors ${
                isOver
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-indigo-200 bg-indigo-50/70 text-indigo-600'
            }`}
        >
            <span className="inline-flex items-center gap-2">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                </svg>
                Drop category here to make it a child
            </span>
        </div>
    );
};

const CategoryTreeItem = ({
    category,
    depth,
    expandedCategories,
    openChildDropTargetId,
    onToggleExpand,
    onEdit,
    onDelete,
    onAddChild,
    onToggleChildDrop,
    onToggleStatus,
    onToggleFeatured,
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: category._id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const directChildrenCount = Array.isArray(category.children) ? category.children.length : 0;
    const hasChildren = directChildrenCount > 0;
    const isExpanded = expandedCategories.has(category._id);

    const getLevelColor = (level) => {
        const colors = [
            'bg-green-50 border-green-200',
            'bg-blue-50 border-blue-200',
            'bg-purple-50 border-purple-200',
            'bg-pink-50 border-pink-200',
            'bg-yellow-50 border-yellow-200',
            'bg-indigo-50 border-indigo-200',
        ];
        return colors[level % colors.length];
    };

    const getLevelBadge = (level) => {
        const badges = [
            { text: 'Level 0', color: 'bg-green-500' },
            { text: 'Level 1', color: 'bg-blue-500' },
            { text: 'Level 2', color: 'bg-purple-500' },
            { text: 'Level 3', color: 'bg-pink-500' },
            { text: 'Level 4', color: 'bg-yellow-500' },
            { text: 'Level 5', color: 'bg-indigo-500' },
        ];
        const badge = badges[level] || { text: `Level ${level}`, color: 'bg-gray-500' };
        return badge;
    };

    const badge = getLevelBadge(depth);

    return (
        <div ref={setNodeRef} style={style} className="relative">
            {/* Main Category Item */}
            <div
                className={`border-2 rounded-xl transition-all ${getLevelColor(depth)} ${
                    isDragging ? 'shadow-2xl scale-[1.01]' : 'hover:shadow-lg'
                }`}
                style={{ marginLeft: `${depth * 40}px` }}
            >
                <div className="p-4 sm:p-5">
                    <div className="flex items-center gap-3">
                        {/* Drag Handle */}
                        <button
                            {...attributes}
                            {...listeners}
                            className="cursor-move rounded-lg p-1 text-slate-400 transition-colors hover:bg-white/60 hover:text-slate-700"
                            title="Drag to reorder"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                            </svg>
                        </button>

                        {/* Expand/Collapse Button */}
                        {hasChildren ? (
                            <button
                                onClick={() => onToggleExpand(category._id)}
                                className="text-slate-600 transition-transform hover:text-slate-800"
                            >
                                <svg
                                    className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                >
                                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                </svg>
                            </button>
                        ) : (
                            <div className="w-5"></div>
                        )}

                        {/* Category Icon */}
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
                            {category.photo ? (
                                <img
                                    src={`${API_CONFIG.BASE_URL}${category.photo}`}
                                    alt={category.title}
                                    className="w-full h-full object-cover rounded-lg"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.parentElement.innerHTML = '<svg class="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" /></svg>';
                                    }}
                                />
                            ) : (
                                <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                                </svg>
                            )}
                        </div>

                        {/* Category Info */}
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="truncate text-lg font-black text-slate-900">{category.title}</h3>
                                <span className={`px-2 py-0.5 text-xs font-bold text-white rounded ${badge.color}`}>
                                    {badge.text}
                                </span>
                                {category.isFeatured && (
                                    <span className="px-2 py-0.5 text-xs font-bold rounded bg-amber-100 text-amber-700">
                                        Featured
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                                <span className="flex items-center gap-1">
                                    <span className="font-medium">ID:</span> {category._id.slice(-8)}
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="font-medium">Slug:</span> {category.slug}
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="font-medium">Children:</span> {directChildrenCount}
                                </span>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Status Toggle */}
                            <button
                                onClick={() => onToggleStatus(category._id, category.status)}
                                className={`rounded-full px-3 py-1 text-xs font-bold ${
                                    category.status === 'active'
                                        ? 'bg-green-500 text-white hover:bg-green-600'
                                        : 'bg-gray-400 text-white hover:bg-gray-500'
                                }`}
                                title={`Click to ${category.status === 'active' ? 'deactivate' : 'activate'}`}
                            >
                                {category.status === 'active' ? 'active' : 'inactive'}
                            </button>

                            {/* Add Child */}
                            <button
                                onClick={() => onAddChild(category._id)}
                                className="rounded-lg bg-emerald-500 p-2 text-white transition-colors hover:bg-emerald-400"
                                title="Add child category"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                            </button>

                            {/* Move */}
                            <button
                                onClick={() => onToggleChildDrop(category._id)}
                                className="rounded-lg bg-indigo-500 p-2 text-white transition-colors hover:bg-indigo-400"
                                title="Toggle child drop area"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    {openChildDropTargetId === category._id ? (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                    ) : (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    )}
                                </svg>
                            </button>

                            {/* Edit */}
                            <button
                                onClick={() => onEdit(category)}
                                className="rounded-lg bg-slate-900 p-2 text-white transition-colors hover:bg-slate-700"
                                title="Edit category"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                            </button>

                            {/* Copy */}
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(category._id);
                                    notify.success('Category ID copied');
                                }}
                                className="rounded-lg bg-cyan-500 p-2 text-white transition-colors hover:bg-cyan-400"
                                title="Copy ID"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                            </button>

                            {/* Star (Featured) */}
                            <button
                                onClick={() => onToggleFeatured(category._id, category.isFeatured)}
                                className={`p-2 rounded-lg transition-colors ${
                                    category.isFeatured
                                        ? 'bg-amber-400 text-white hover:bg-amber-500'
                                        : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                                }`}
                                title={category.isFeatured ? 'Click to remove featured' : 'Click to mark as featured'}
                            >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                            </button>

                            {/* Delete */}
                            <button
                                onClick={() => onDelete(category._id)}
                                className="rounded-lg bg-rose-500 p-2 text-white transition-colors hover:bg-rose-400"
                                title="Delete category"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>

                            {/* Number Badge */}
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-white">
                                {directChildrenCount}
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {openChildDropTargetId === category._id && (
                <ChildDropSection categoryId={category._id} depth={depth} />
            )}

            {/* Render Children */}
            {hasChildren && isExpanded && (
                <div className="mt-2 space-y-2">
                    {category.children.map((child) => (
                        <CategoryTreeItem
                            key={child._id}
                            category={child}
                            depth={depth + 1}
                            expandedCategories={expandedCategories}
                            openChildDropTargetId={openChildDropTargetId}
                            onToggleExpand={onToggleExpand}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onAddChild={onAddChild}
                            onToggleChildDrop={onToggleChildDrop}
                            onToggleStatus={onToggleStatus}
                            onToggleFeatured={onToggleFeatured}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default CategoryTreeItem;

