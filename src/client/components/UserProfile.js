import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
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

const UserProfile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { id } = useParams();

  useEffect(() => {
    const fetchUserProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get(`/api/users/${id}`);
        setUser(response.data);
      } catch (err) {
        setError("ユーザープロフィールの取得中にエラーが発生しました。");
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  if (!user) return null;

  return (
    <ProfileContainer>
      <ProfileInfo>
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
