-- ====================================================================
-- 신구길(Shingu-gil) 수파베이스(Supabase) 데이터베이스 스키마
-- 프로젝트 분석 및 설치 과목 - DB 테이블 설계 및 자동 생성 스크립트
-- ====================================================================

-- 1. 사용자 프로필 테이블 (운전자 및 탑승자 공통)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(50) UNIQUE NOT NULL,      -- 로그인용 아이디
  name VARCHAR(50) NOT NULL,                 -- 사용자 실명
  email VARCHAR(100) NOT NULL,               -- 신구대 이메일
  phone VARCHAR(20),                         -- 연락처
  gender VARCHAR(20) DEFAULT '선택 안 함',    -- 성별
  role VARCHAR(20) DEFAULT 'rider',          -- 'driver' 또는 'rider'
  
  -- 운전자 전용 필드
  license_verified BOOLEAN DEFAULT FALSE,    -- 면허 인증 여부
  vehicle_name VARCHAR(100),                 -- 차종 (예: 현대 아반떼)
  vehicle_capacity INT DEFAULT 5,            -- 차량 정원
  driver_seats INT DEFAULT 3,                -- 모집 좌석 수
  departure_time VARCHAR(50) DEFAULT '08:10',-- 출발 시간대
  weekdays TEXT[] DEFAULT ARRAY['월','수','금'], -- 자주 이용하는 요일
  
  rating NUMERIC(3,2) DEFAULT 5.0,           -- 매너 평점
  points INT DEFAULT 10000,                  -- 보유 포인트
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 카풀 모집글 테이블 (Rides)
CREATE TABLE IF NOT EXISTS public.rides (
  id BIGSERIAL PRIMARY KEY,
  driver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  driver_name VARCHAR(50) NOT NULL,
  vehicle_info VARCHAR(100) NOT NULL,
  start_point VARCHAR(100) NOT NULL,         -- 출발지 (예: 모란역 5번 출구)
  end_point VARCHAR(100) NOT NULL,           -- 목적지 (예: 신구대학교 정문)
  via_point VARCHAR(100),                    -- 경유지
  departure_time VARCHAR(50) NOT NULL,       -- 출발 시각
  estimated_duration INT DEFAULT 30,         -- 소요 시간(분)
  total_seats INT DEFAULT 3,                 -- 전체 모집 좌석
  available_seats INT DEFAULT 3,             -- 남은 좌석
  price INT DEFAULT 2800,                    -- 카풀 요금(원/P)
  status VARCHAR(20) DEFAULT '모집중',        -- '모집중', '운행중', '운행완료', '취소'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 카풀 신청 및 매칭 테이블 (Applications)
CREATE TABLE IF NOT EXISTS public.carpool_applications (
  id BIGSERIAL PRIMARY KEY,
  ride_id BIGINT REFERENCES public.rides(id) ON DELETE CASCADE,
  rider_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  rider_name VARCHAR(50) NOT NULL,
  seats INT DEFAULT 1,
  status VARCHAR(20) DEFAULT '대기중',       -- '대기중', '수락됨', '거절됨', '취소됨'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 포인트 및 결제 내역 테이블 (Point History)
CREATE TABLE IF NOT EXISTS public.point_history (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL,                 -- '충전', '결제', '정산', '환불'
  status VARCHAR(20) DEFAULT '완료',          -- '대기', '완료', '취소'
  amount INT NOT NULL,
  description VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 안전 신고 및 문의 테이블 (Safety Reports)
CREATE TABLE IF NOT EXISTS public.safety_reports (
  id BIGSERIAL PRIMARY KEY,
  reporter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason VARCHAR(100) NOT NULL,
  details TEXT,
  status VARCHAR(20) DEFAULT '검토 중',       -- '검토 중', '처리 완료'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS(Row Level Security) 설정 (데모 발표 시 간편 조회를 위해 공개 허용 정책 추가)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carpool_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_reports ENABLE ROW LEVEL SECURITY;

-- 데모/발표용 전체 읽기/쓰기 정책 (발표 편의를 위해 익명 키로 허용)
CREATE POLICY "Public Read/Write Profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write Rides" ON public.rides FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write Applications" ON public.carpool_applications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write Points" ON public.point_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write Reports" ON public.safety_reports FOR ALL USING (true) WITH CHECK (true);
