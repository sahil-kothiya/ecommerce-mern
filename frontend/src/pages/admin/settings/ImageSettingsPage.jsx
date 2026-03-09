import React, { useEffect, useState, useCallback } from 'react';
import notify from '../../../utils/notify';
import settingsService from '../../../services/settingsService';
import SavingOverlay from '../../../components/ui/SavingOverlay';

const SECTIONS = [
  { key: 'product', label: 'Products', icon: '📦' },
  { key: 'category', label: 'Categories', icon: '📂' },
  { key: 'banner', label: 'Banners', icon: '🖼️' },
  { key: 'avatar', label: 'Avatars', icon: '👤' },
  { key: 'brand', label: 'Brands', icon: '🏷️' },
  { key: 'review', label: 'Reviews', icon: '⭐' },
  { key: 'settings', label: 'Settings', icon: '⚙️' },
];

const OUTPUT_FORMATS = ['webp', 'jpeg', 'png', 'avif'];

const ASPECT_RATIOS = ['free', '1:1', '4:3', '3:2', '16:9', '2:1', '3:4', '9:16'];

const DEFAULT_SECTION = {
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 85,
  maxCount: 10,
  aspectRatio: 'free',
};

const ImageSettingsPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [globalSettings, setGlobalSettings] = useState(null);
  const [expandedSection, setExpandedSection] = useState(null);

  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await settingsService.getImageSettings();
      setGlobalSettings(response.data);
    } catch (error) {
      notify.error(error.message || 'Failed to load image settings');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleGlobalChange = (field, value) => {
    setGlobalSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleSectionChange = (sectionKey, field, value) => {
    setGlobalSettings((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [sectionKey]: {
          ...(prev.sections?.[sectionKey] || DEFAULT_SECTION),
          [field]: value,
        },
      },
    }));
  };

  const handleSaveGlobal = async () => {
    try {
      setIsSaving(true);
      const { sections, ...globalData } = globalSettings;
      await settingsService.updateImageSettings(globalData);
      notify.success('Global image settings saved');
    } catch (error) {
      notify.error(error.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSection = async (sectionKey) => {
    try {
      setIsSaving(true);
      const sectionData = globalSettings.sections?.[sectionKey] || DEFAULT_SECTION;
      await settingsService.updateImageSectionSettings(sectionKey, sectionData);
      notify.success(`${sectionKey} section settings saved`);
    } catch (error) {
      notify.error(error.message || `Failed to save ${sectionKey} settings`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Reset all image settings to defaults? This cannot be undone.')) return;
    try {
      setIsSaving(true);
      await settingsService.resetImageSettings();
      await fetchSettings();
      notify.success('Image settings reset to defaults');
    } catch (error) {
      notify.error(error.message || 'Failed to reset settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (!globalSettings) {
    return (
      <div className="rounded-lg bg-red-50 p-6 text-center text-red-700">
        Failed to load image settings. Please refresh.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isSaving && <SavingOverlay />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Image Settings</h1>
          <p className="mt-1 text-sm text-gray-500">
            Configure image processing, formats, and per-section settings.
          </p>
        </div>
        <button
          onClick={handleReset}
          disabled={isSaving}
          className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          Reset to Defaults
        </button>
      </div>

      {/* Global Settings Card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-700">Global Settings</h2>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Allowed Input Formats */}
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="mb-2 block text-sm font-medium text-gray-600">
              Allowed Input Formats
            </label>
            <div className="flex flex-wrap gap-2">
              {['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'tif', 'svg', 'heic', 'heif', 'avif', 'ico'].map(
                (fmt) => {
                  const isActive = globalSettings.allowedInputFormats?.includes(fmt);
                  return (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => {
                        const formats = globalSettings.allowedInputFormats || [];
                        handleGlobalChange(
                          'allowedInputFormats',
                          isActive ? formats.filter((f) => f !== fmt) : [...formats, fmt],
                        );
                      }}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      .{fmt}
                    </button>
                  );
                },
              )}
            </div>
          </div>

          {/* Preferred Output Format */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-600">
              Output Format
            </label>
            <select
              value={globalSettings.preferredOutputFormat || 'webp'}
              onChange={(e) => handleGlobalChange('preferredOutputFormat', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {OUTPUT_FORMATS.map((f) => (
                <option key={f} value={f}>
                  {f.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Max File Size */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-600">
              Max File Size (MB)
            </label>
            <input
              type="number"
              min={1}
              max={50}
              step={1}
              value={Math.round((globalSettings.maxFileSizeBytes || 10485760) / 1048576)}
              onChange={(e) =>
                handleGlobalChange('maxFileSizeBytes', parseInt(e.target.value, 10) * 1048576)
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Auto Convert Toggle */}
          <div className="flex items-center gap-3">
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={globalSettings.autoConvertEnabled ?? true}
                onChange={(e) => handleGlobalChange('autoConvertEnabled', e.target.checked)}
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white" />
            </label>
            <span className="text-sm font-medium text-gray-600">Auto Convert Images</span>
          </div>

          {/* Thumbnail Toggle */}
          <div className="flex items-center gap-3">
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={globalSettings.autoGenerateThumbnail ?? true}
                onChange={(e) => handleGlobalChange('autoGenerateThumbnail', e.target.checked)}
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white" />
            </label>
            <span className="text-sm font-medium text-gray-600">Auto Generate Thumbnails</span>
          </div>

          {/* Thumbnail Width */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-600">
              Thumbnail Width (px)
            </label>
            <input
              type="number"
              min={50}
              max={800}
              value={globalSettings.thumbnailWidth || 300}
              onChange={(e) => handleGlobalChange('thumbnailWidth', parseInt(e.target.value, 10))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Thumbnail Height */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-600">
              Thumbnail Height (px)
            </label>
            <input
              type="number"
              min={50}
              max={800}
              value={globalSettings.thumbnailHeight || 300}
              onChange={(e) => handleGlobalChange('thumbnailHeight', parseInt(e.target.value, 10))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSaveGlobal}
            disabled={isSaving}
            className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Save Global Settings
          </button>
        </div>
      </div>

      {/* Per-Section Settings */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-6 pb-4">
          <h2 className="text-lg font-semibold text-gray-700">Per-Section Settings</h2>
          <p className="mt-1 text-sm text-gray-500">
            Configure image dimensions, quality, and limits for each section.
          </p>
        </div>

        <div className="divide-y divide-gray-100">
          {SECTIONS.map(({ key, label, icon }) => {
            const section = globalSettings.sections?.[key] || DEFAULT_SECTION;
            const isExpanded = expandedSection === key;

            return (
              <div key={key}>
                <button
                  type="button"
                  onClick={() => setExpandedSection(isExpanded ? null : key)}
                  className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{icon}</span>
                    <span className="font-medium text-gray-700">{label}</span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                      {section.maxWidth}×{section.maxHeight}px • Q{section.quality}
                    </span>
                  </div>
                  <svg
                    className={`h-5 w-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/50 px-6 py-5">
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-600">
                          Max Width (px)
                        </label>
                        <input
                          type="number"
                          min={100}
                          max={4000}
                          value={section.maxWidth}
                          onChange={(e) =>
                            handleSectionChange(key, 'maxWidth', parseInt(e.target.value, 10))
                          }
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-600">
                          Max Height (px)
                        </label>
                        <input
                          type="number"
                          min={100}
                          max={4000}
                          value={section.maxHeight}
                          onChange={(e) =>
                            handleSectionChange(key, 'maxHeight', parseInt(e.target.value, 10))
                          }
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-600">
                          Quality: {section.quality}%
                        </label>
                        <input
                          type="range"
                          min={10}
                          max={100}
                          step={5}
                          value={section.quality}
                          onChange={(e) =>
                            handleSectionChange(key, 'quality', parseInt(e.target.value, 10))
                          }
                          className="w-full accent-blue-600"
                        />
                        <div className="flex justify-between text-xs text-gray-400">
                          <span>10%</span>
                          <span>100%</span>
                        </div>
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-600">
                          Max File Count
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={50}
                          value={section.maxCount}
                          onChange={(e) =>
                            handleSectionChange(key, 'maxCount', parseInt(e.target.value, 10))
                          }
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-600">
                          Aspect Ratio
                        </label>
                        <select
                          value={section.aspectRatio || 'free'}
                          onChange={(e) => handleSectionChange(key, 'aspectRatio', e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          {ASPECT_RATIOS.map((r) => (
                            <option key={r} value={r}>
                              {r === 'free' ? 'Free (No constraint)' : r}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => handleSaveSection(key)}
                        disabled={isSaving}
                        className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        Save {label} Settings
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Current Config Preview */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-gray-700">Current Configuration Preview</h2>
        <pre className="max-h-64 overflow-auto rounded-lg bg-gray-900 p-4 text-xs text-green-400">
          {JSON.stringify(globalSettings, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default ImageSettingsPage;
