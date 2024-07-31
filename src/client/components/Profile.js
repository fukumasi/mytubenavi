import React, { useState, useEffect } from 'react';

const Profile = () => {
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    bio: '',
    avatar: '',
    preferences: { theme: 'light', language: 'en', notifications: true },
    socialLinks: { twitter: '', instagram: '', youtube: '' }
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      // Simulating API call
      const response = await fetch('/api/user/profile', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(prevProfile => ({
      ...prevProfile,
      [name]: value
    }));
  };

  const handlePreferenceChange = (e) => {
    const { name, value, type, checked } = e.target;
    setProfile(prevProfile => ({
      ...prevProfile,
      preferences: {
        ...prevProfile.preferences,
        [name]: type === 'checkbox' ? checked : value
      }
    }));
  };

  const handleSocialLinkChange = (e) => {
    const { name, value } = e.target;
    setProfile(prevProfile => ({
      ...prevProfile,
      socialLinks: {
        ...prevProfile.socialLinks,
        [name]: value
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Simulating API call
      await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify(profile)
      });
      alert('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Error updating profile');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">User Profile</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          name="firstName"
          placeholder="First Name"
          value={profile.firstName}
          onChange={handleChange}
          className="w-full p-2 border rounded"
        />
        <input
          type="text"
          name="lastName"
          placeholder="Last Name"
          value={profile.lastName}
          onChange={handleChange}
          className="w-full p-2 border rounded"
        />
        <textarea
          name="bio"
          placeholder="Bio"
          value={profile.bio}
          onChange={handleChange}
          className="w-full p-2 border rounded"
        />
        <input
          type="text"
          name="avatar"
          placeholder="Avatar URL"
          value={profile.avatar}
          onChange={handleChange}
          className="w-full p-2 border rounded"
        />
        <div>
          <h3 className="font-semibold">Preferences</h3>
          <select 
            name="theme" 
            value={profile.preferences.theme} 
            onChange={handlePreferenceChange}
            className="w-full p-2 border rounded mt-2"
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
          <select 
            name="language" 
            value={profile.preferences.language} 
            onChange={handlePreferenceChange}
            className="w-full p-2 border rounded mt-2"
          >
            <option value="en">English</option>
            <option value="ja">日本語</option>
          </select>
          <label className="flex items-center mt-2">
            <input
              type="checkbox"
              name="notifications"
              checked={profile.preferences.notifications}
              onChange={handlePreferenceChange}
              className="mr-2"
            />
            Receive notifications
          </label>
        </div>
        <div>
          <h3 className="font-semibold">Social Links</h3>
          <input
            type="text"
            name="twitter"
            placeholder="Twitter"
            value={profile.socialLinks.twitter}
            onChange={handleSocialLinkChange}
            className="w-full p-2 border rounded mt-2"
          />
          <input
            type="text"
            name="instagram"
            placeholder="Instagram"
            value={profile.socialLinks.instagram}
            onChange={handleSocialLinkChange}
            className="w-full p-2 border rounded mt-2"
          />
          <input
            type="text"
            name="youtube"
            placeholder="YouTube"
            value={profile.socialLinks.youtube}
            onChange={handleSocialLinkChange}
            className="w-full p-2 border rounded mt-2"
          />
        </div>
        <button type="submit" className="w-full p-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Update Profile
        </button>
      </form>
    </div>
  );
};

export default Profile;