import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../contexts/AuthContext"; // AuthContextをインポート
import styled from "styled-components";
import LoadingSpinner from "./LoadingSpinner";
import ErrorMessage from "./ErrorMessage";

const ProfileContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
`;

const ProfileInfo = styled.div`
  margin-bottom: 20px;
`;

const EditButton = styled.button`
  background-color: #007bff;
  color: white;
  border: none;
  padding: 10px 15px;
  cursor: pointer;
  margin-top: 10px;
`;

const Input = styled.input`
  width: 100%;
  padding: 8px;
  margin-bottom: 10px;
`;

const UserProfile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState(null);
  const { id } = useParams();
  const { currentUser } = useAuth(); // 現在のログインユーザーを取得

  useEffect(() => {
    const fetchUserProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const userDoc = await getDoc(doc(db, "users", id));
        if (userDoc.exists()) {
          const userData = { id: userDoc.id, ...userDoc.data() };
          setUser(userData);
          setEditedUser(userData);
        } else {
          setError("指定されたユーザーが見つかりません。");
        }
      } catch (err) {
        console.error("Error fetching user profile:", err);
        setError("ユーザープロフィールの取得中にエラーが発生しました。");
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [id]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      await updateDoc(doc(db, "users", id), editedUser);
      setUser(editedUser);
      setIsEditing(false);
    } catch (err) {
      console.error("Error updating user profile:", err);
      setError("プロフィールの更新中にエラーが発生しました。");
    }
  };

  const handleChange = (e) => {
    setEditedUser({ ...editedUser, [e.target.name]: e.target.value });
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  if (!user) return null;

  const isOwnProfile = currentUser && currentUser.uid === id;

  return (
    <ProfileContainer>
      <ProfileInfo>
        {isEditing ? (
          <>
            <Input
              name="username"
              value={editedUser.username}
              onChange={handleChange}
            />
            {editedUser.userType === "creator" && (
              <>
                <Input
                  name="channelName"
                  value={editedUser.channelName}
                  onChange={handleChange}
                />
                <textarea
                  name="channelDescription"
                  value={editedUser.channelDescription}
                  onChange={handleChange}
                />
              </>
            )}
            <EditButton onClick={handleSave}>保存</EditButton>
          </>
        ) : (
          <>
            <h1>{user.username}</h1>
            <p>
              ユーザータイプ:{" "}
              {user.userType === "creator" ? "クリエイター" : "一般ユーザー"}
            </p>
            {user.userType === "creator" && (
              <>
                <h2>チャンネル情報</h2>
                <p>チャンネル名: {user.channelName}</p>
                <p>チャンネル説明: {user.channelDescription}</p>
                <p>登録者数: {user.subscriberCount}</p>
              </>
            )}
            {isOwnProfile && <EditButton onClick={handleEdit}>編集</EditButton>}
          </>
        )}
      </ProfileInfo>
      {user.userType === "creator" && (
        <div>
          <h2>有料掲載動画</h2>
          {/* ここに有料掲載動画のリストを表示するコンポーネントを追加 */}
        </div>
      )}
    </ProfileContainer>
  );
};

export default UserProfile;