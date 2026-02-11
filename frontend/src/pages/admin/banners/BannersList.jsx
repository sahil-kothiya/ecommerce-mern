import React, { useState, useEffect } from 'react';

const BannersList = () => {
    const [banners, setBanners] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingBanner, setEditingBanner] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        subtitle: '',
        link: '',
        image: '',
        status: 'active',
        position: 'home-hero',
    });

    useEffect(() => {
        loadBanners();
    }, []);

    const loadBanners = () => {
        // Mock banners data
        setBanners([
            { _id: '1', title: 'Summer Sale', subtitle: 'Up to 70% Off', link: '/products', position: 'home-hero', status: 'active' },
            { _id: '2', title: 'New Arrivals', subtitle: 'Check out latest products', link: '/products/new', position: 'home-banner', status: 'active' },
            { _id: '3', title: 'Free Shipping', subtitle: 'On orders over $50', link: '/shipping', position: 'top-bar', status: 'active' },
        ]);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        alert(`Banner ${editingBanner ? 'updated' : 'created'} successfully!`);
        setShowModal(false);
        setEditingBanner(null);
        setFormData({ title: '', subtitle: '', link: '', image: '', status: 'active', position: 'home-hero' });
        loadBanners();
    };

    const handleEdit = (banner) => {
        setEditingBanner(banner);
        setFormData({
            title: banner.title,
            subtitle: banner.subtitle,
            link: banner.link,
            image: banner.image || '',
            status: banner.status,
            position: banner.position,
        });
        setShowModal(true);
    };

    const handleDelete = (id) => {
        if (!window.confirm('Are you sure you want to delete this banner?')) return;
        alert('Banner deleted successfully!');
        loadBanners();
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Banners</h1>
                    <p className="text-gray-600 mt-1">Manage promotional banners and announcements</p>
                </div>
                <button
                    onClick={() => {
                        setEditingBanner(null);
                        setFormData({ title: '', subtitle: '', link: '', image: '', status: 'active', position: 'home-hero' });
                        setShowModal(true);
                    }}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Banner
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {banners.map((banner) => (
                    <div key={banner._id} className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden hover:border-blue-500 transition-all">
                        <div className="bg-gradient-to-r from-blue-600 to-purple-600 h-40 flex items-center justify-center text-white">
                            <div className="text-center">
                                <h3 className="text-2xl font-bold mb-2">{banner.title}</h3>
                                <p className="text-lg">{banner.subtitle}</p>
                            </div>
                        </div>
                        <div className="p-4">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-sm text-gray-600">Position: <span className="font-semibold">{banner.position}</span></span>
                                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                                    banner.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                }`}>
                                    {banner.status}
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleEdit(banner)}
                                    className="flex-1 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-semibold"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDelete(banner._id)}
                                    className="flex-1 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-semibold"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-md w-full p-6">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">
                            {editingBanner ? 'Edit' : 'Create'} Banner
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Title *</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Subtitle</label>
                                <input
                                    type="text"
                                    value={formData.subtitle}
                                    onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Link URL</label>
                                <input
                                    type="text"
                                    value={formData.link}
                                    onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="/products"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Banner Image</label>
                                <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/gif,image/webp"
                                    onChange={(e) => {
                                        const file = e.target.files[0];
                                        if (file) {
                                            setFormData({ ...formData, image: file });
                                        }
                                    }}
                                    className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none px-3 py-2"
                                />
                                <p className="mt-1 text-sm text-blue-600">Upload an image (JPG, PNG, GIF, WEBP - Max 5MB)</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Position</label>
                                    <select
                                        value={formData.position}
                                        onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="home-hero">Home Hero</option>
                                        <option value="home-banner">Home Banner</option>
                                        <option value="top-bar">Top Bar</option>
                                        <option value="sidebar">Sidebar</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
                                >
                                    {editingBanner ? 'Update' : 'Create'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BannersList;
