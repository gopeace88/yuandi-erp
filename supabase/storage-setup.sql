-- Supabase Storage 버킷 생성 및 정책 설정
-- 이 스크립트를 Supabase SQL Editor에서 실행하세요

-- images 버킷 생성 (이미 존재하면 스킵)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'images',
  'images',
  true, -- 공개 버킷으로 설정
  5242880, -- 5MB 제한
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- RLS 정책: 인증된 사용자만 업로드 가능
CREATE POLICY "Authenticated users can upload images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'images');

-- RLS 정책: 모든 사용자가 이미지 조회 가능 (공개 버킷)
CREATE POLICY "Anyone can view images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'images');

-- RLS 정책: 인증된 사용자는 자신이 올린 이미지 삭제 가능
CREATE POLICY "Users can delete own images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'images' AND auth.uid()::text = owner::text);

-- RLS 정책: 인증된 사용자는 자신이 올린 이미지 수정 가능
CREATE POLICY "Users can update own images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'images' AND auth.uid()::text = owner::text)
WITH CHECK (bucket_id = 'images' AND auth.uid()::text = owner::text);
