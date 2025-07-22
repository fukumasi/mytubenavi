# MyTubeNavi 2.0 API Specification

## 1. 基本情報

| 項目             | 値                                         |
| -------------- | ----------------------------------------- |
| ベース URL (stg)  | `https://stg.api.mytubenavi.app`          |
| ベース URL (prod) | `https://api.mytubenavi.app`              |
| API バージョン      | `v1` (URL に含めずヘッダ `x-api-version: 1` で送信) |
| 認証方式           | Supabase JWT (Bearer)                     |
| レスポンス形式        | `application/json; charset=utf-8`         |

### 1.1 認可

* **スコープ**: JWT に `role` クレーム (`user` / `premium` / `admin`) を付与
* **RLS**: テーブルごとに `auth.uid() = user_id` 等で行レベルセキュリティを実施

### 1.2 エラー形式

```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "video_id is required",
    "details": null
  }
}
```

| HTTP ステータス                | 説明              |
| ------------------------- | --------------- |
| 400 Bad Request           | バリデーションエラー      |
| 401 Unauthorized          | 認証失敗 / トークン期限切れ |
| 403 Forbidden             | RLS/権限エラー       |
| 404 Not Found             | リソース不存在         |
| 409 Conflict              | ユニーク制約違反 等      |
| 429 Too Many Requests     | レート制限           |
| 500 Internal Server Error | 予期しないサーバエラー     |

---

## 2. REST API 詳細

### 2.1 認証 & ユーザー管理

| Method | Path               | 説明       |
| ------ | ------------------ | -------- |
| POST   | /api/auth/signup   | 新規登録     |
| POST   | /api/auth/login    | ログイン     |
| POST   | /api/auth/logout   | ログアウト    |
| GET    | /api/users/profile | プロフィール取得 |
| PUT    | /api/users/profile | プロフィール更新 |
| DELETE | /api/users/account | アカウント削除  |

### 2.2 マッチング

| Method | Path                     | 説明             |
| ------ | ------------------------ | -------------- |
| GET    | /api/matching/candidates | 候補取得           |
| POST   | /api/matching/swipe      | Like / Pass 送信 |
| GET    | /api/matching/matches    | マッチ一覧          |
| POST   | /api/matching/refresh    | 候補再計算リクエスト     |

#### 2.2.1 POST /api/matching/swipe

```jsonc
// Request
{
  "targetUserId": "uuid",
  "action": "like" // or "pass"
}

// Response 200
{
  "success": true,
  "isMatch": true
}
```

### 2.3 チャット

| Method | Path                 |
| ------ | -------------------- |
| GET    | /api/chat/rooms      |
| GET    | /api/chat/rooms/\:id |
| POST   | /api/chat/rooms/\:id |

### 2.4 視聴データ

| Method | Path                   | 説明     |
| ------ | ---------------------- | ------ |
| POST   | /api/viewing/track     | 視聴履歴記録 |
| GET    | /api/viewing/history   | 個人視聴履歴 |
| POST   | /api/viewing/rate      | 動画評価   |
| GET    | /api/viewing/analytics | 視聴分析   |

#### 2.4.1 POST /api/viewing/track – 例

```json
{
  "video_id": "dQw4w9WgXcQ",
  "duration": 180,
  "completion_rate": 0.85,
  "rating": 4
}
```

### 2.5 決済 (Stripe)

| Method | Path                   |
| ------ | ---------------------- |
| POST   | /api/payment/subscribe |
| POST   | /api/payment/cancel    |
| GET    | /api/payment/status    |
| POST   | /api/payment/gift      |

---

## 3. Realtime チャンネル

| チャンネルキー                 | トリガ    | テーブル            | ペイロード例                                                      |
| ----------------------- | ------ | --------------- | ----------------------------------------------------------- |
| `user-{userId}-matches` | INSERT | `matches`       | `{ "matchId": "...", "matchedAt": "2025-07-20T12:34:56Z" }` |
| `chat-room-{roomId}`    | INSERT | `chat_messages` | `{ "senderId": "...", "message": "こんにちは" }`                 |

サブスク例 (TypeScript):

```ts
supabase
  .channel(`user-${userId}-matches`)
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'matches' }, handleNewMatch)
  .subscribe();
```

---

## 4. RLS ポリシーマッピング (抜粋)

| テーブル              | ルール概要                                                                                           |
| ----------------- | ----------------------------------------------------------------------------------------------- |
| `user_likes`      | `sender_id = auth.uid()` かつ `is_premium = true OR daily_like_count < FREE_DAILY_LIMIT`          |
| `matches`         | `user_id_1 = auth.uid() OR user_id_2 = auth.uid()`                                              |
| `viewing_history` | `user_id = auth.uid()`                                                                          |
| `chat_messages`   | `room_id IN (SELECT id FROM chat_rooms WHERE user_id_1 = auth.uid() OR user_id_2 = auth.uid())` |

---

## 5. 変更履歴

| 日付         | バージョン | 変更点  |
| ---------- | ----- | ---- |
| 2025-07-20 | 1.0   | 初版作成 |
