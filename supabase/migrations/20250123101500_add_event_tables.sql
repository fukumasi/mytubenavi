-- イベントテーブル
CREATE TABLE events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    event_type TEXT NOT NULL CHECK (event_type IN ('online', 'offline')),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    location TEXT,
    online_url TEXT,
    max_participants INTEGER,
    price INTEGER DEFAULT 0,
    thumbnail_url TEXT,
    organizer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'cancelled')),
    is_featured BOOLEAN DEFAULT false,
    CONSTRAINT valid_date_range CHECK (end_date > start_date),
    CONSTRAINT valid_location CHECK (
        (event_type = 'online' AND online_url IS NOT NULL) OR
        (event_type = 'offline' AND location IS NOT NULL)
    )
);

-- イベント参加者テーブル
CREATE TABLE event_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'refunded')),
    payment_intent_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(event_id, user_id)
);

-- イベントタグテーブル
CREATE TABLE event_tags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- イベントとタグの中間テーブル
CREATE TABLE event_tag_relations (
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES event_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (event_id, tag_id)
);

-- イベントコメントテーブル
CREATE TABLE event_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS（行レベルセキュリティ）ポリシーの設定
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_comments ENABLE ROW LEVEL SECURITY;

-- イベント閲覧ポリシー（全ユーザー）
CREATE POLICY "Events are viewable by everyone" ON events
    FOR SELECT USING (status = 'published');

-- イベント作成ポリシー（認証済みユーザーのみ）
CREATE POLICY "Authenticated users can create events" ON events
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- イベント更新ポリシー（主催者のみ）
CREATE POLICY "Organizers can update their events" ON events
    FOR UPDATE USING (auth.uid() = organizer_id);

-- イベント削除ポリシー（主催者のみ）
CREATE POLICY "Organizers can delete their events" ON events
    FOR DELETE USING (auth.uid() = organizer_id);

-- イベント参加ポリシー（認証済みユーザーのみ）
CREATE POLICY "Authenticated users can participate in events" ON event_participants
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- トリガー関数の作成（updated_at自動更新用）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 更新日時自動更新トリガーの設定
CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_event_participants_updated_at
    BEFORE UPDATE ON event_participants
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- インデックスの作成
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_start_date ON events(start_date);
CREATE INDEX idx_event_participants_status ON event_participants(status);