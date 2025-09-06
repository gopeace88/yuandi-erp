// JWT 토큰 디코딩 확인
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpa3dmZXN2bW9oZnBva2dlcXR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQzODU1MjksImV4cCI6MjAzOTk2MTUyOX0.kPNyIDLELG6HwPFQJYu8dCl7mVfUqE1_bKKB7jFu83k';

// Base64 디코딩
const parts = anonKey.split('.');
const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

console.log('JWT Payload:');
console.log(JSON.stringify(payload, null, 2));

// 유효기간 확인
const exp = new Date(payload.exp * 1000);
const iat = new Date(payload.iat * 1000);
const now = new Date();

console.log('\n날짜 정보:');
console.log('발급일:', iat.toISOString());
console.log('만료일:', exp.toISOString());
console.log('현재시간:', now.toISOString());
console.log('유효여부:', now < exp ? '✅ 유효함' : '❌ 만료됨');

console.log('\nSupabase 프로젝트 정보:');
console.log('Project Reference:', payload.ref);
console.log('URL:', `https://${payload.ref}.supabase.co`);