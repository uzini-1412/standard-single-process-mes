// 사용자 권한 정보 화면 진입점. 실제 목록/등록 UI는 RegisterPage가 담당하며 여기서는 그대로 위임만 한다.
import { UserAuthorityInfoRegisterPage } from "./UserAuthorityInfoRegisterPage";

export default function UserAuthorityInfoPage() {
  return <UserAuthorityInfoRegisterPage />;
}
