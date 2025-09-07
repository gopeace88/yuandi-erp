# Supabase MCP Server 설정 가이드

## 1. 필요한 정보 준비

### Project Reference 확인
1. [Supabase Dashboard](https://app.supabase.com) 접속
2. 프로젝트 선택
3. Settings → General
4. **Reference ID** 복사 (예: `abcdefghijklmnop`)

### Personal Access Token 생성
1. [Supabase Dashboard](https://app.supabase.com) 접속
2. 우측 상단 프로필 클릭
3. **Account Settings** → **Access Tokens**
4. **Generate new token** 클릭
5. Token 이름 입력 (예: "MCP Server")
6. 생성된 토큰 복사 (한 번만 표시됨!)

## 2. Claude Desktop 설정

### claude_desktop_config.json 수정

**Windows 경로:**
```
%APPDATA%\Claude\claude_desktop_config.json
```

**Mac 경로:**
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Linux 경로:**
```
~/.config/Claude/claude_desktop_config.json
```

### 설정 내용 추가

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--project-ref=YOUR_PROJECT_REF_HERE"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "YOUR_ACCESS_TOKEN_HERE"
      }
    }
  }
}
```

### 읽기 전용 모드 (권장)
```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--read-only",
        "--project-ref=YOUR_PROJECT_REF_HERE"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "YOUR_ACCESS_TOKEN_HERE"
      }
    }
  }
}
```

## 3. Claude Desktop 재시작

1. Claude Desktop 완전 종료
2. 다시 실행
3. 새 대화 시작

## 4. 사용 가능한 명령어

MCP 서버가 활성화되면 다음과 같은 작업이 가능합니다:

### 데이터베이스 조회
- 테이블 목록 조회
- 테이블 스키마 확인
- 데이터 조회 (SELECT)
- SQL 실행 (읽기 전용 모드에서는 SELECT만)

### 예시 사용법
```
"user_profiles 테이블의 모든 데이터를 보여줘"
"orders 테이블의 스키마를 확인해줘"
"최근 7일간의 주문을 조회해줘"
```

## 5. 보안 주의사항

⚠️ **중요**: 
- Access Token을 절대 공유하지 마세요
- 프로덕션 환경에서는 반드시 `--read-only` 플래그 사용
- 토큰이 노출되면 즉시 재발급하세요

## 6. 문제 해결

### MCP 서버가 연결되지 않는 경우
1. Claude Desktop 완전 재시작
2. 설정 파일 JSON 문법 확인
3. Project Reference와 Token 유효성 확인

### 권한 오류
1. Access Token 권한 확인
2. RLS 정책 확인
3. 읽기 전용 모드 사용 고려

## 7. YUANDI 프로젝트 전용 설정

**Project Reference**: `eikwfesvmohfpokgeqtv` (`.env.local`의 URL에서 추출)

```json
{
  "mcpServers": {
    "yuandi-supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--read-only",
        "--project-ref=eikwfesvmohfpokgeqtv"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "YOUR_PERSONAL_ACCESS_TOKEN_HERE"
      }
    }
  }
}
```

**참고**: 
- Project Reference는 Supabase URL에서 추출: `https://eikwfesvmohfpokgeqtv.supabase.co`
- Personal Access Token은 Supabase Dashboard의 Account Settings에서 생성 필요
- Service Role Key와는 다른 것이므로 새로 생성해야 함

설정 후 다음과 같이 사용:
- "관리자 계정이 있는지 확인해줘"
- "user_profiles 테이블에 admin@yuandi.com이 있는지 확인해줘"
- "orders 테이블의 최근 데이터 10개 보여줘"