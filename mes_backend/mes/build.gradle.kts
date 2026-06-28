plugins {
	java
	id("org.springframework.boot") version "4.0.2"
	id("io.spring.dependency-management") version "1.1.7"
}

group = "com.mes"
version = "0.0.1-SNAPSHOT"
description = "standard MES service"

tasks.withType<JavaExec> {
    systemProperty("file.encoding", "UTF-8")
}

// 혹시 테스트 코드 실행 시에도 깨진다면 아래도 추가
tasks.withType<Test> {
    systemProperty("file.encoding", "UTF-8")
}

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

configurations {
    compileOnly {
        extendsFrom(configurations.annotationProcessor.get())
    }
}

repositories {
    mavenCentral()
}

dependencies {
    // 1. Web & Core
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    // AOP — Spring Boot 4.x BOM에서 starter-aop 버전 미관리 이슈 회피
    implementation("org.springframework:spring-aop")
    implementation("org.aspectj:aspectjweaver:1.9.22")

    // 1-1. Cache (Caffeine in-memory, mes-op 작업지시 목록 등 핫 리드 캐싱)
    implementation("org.springframework.boot:spring-boot-starter-cache")
    implementation("com.github.ben-manes.caffeine:caffeine")

    // 2. Database (MySQL 설정)
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    runtimeOnly("com.mysql:mysql-connector-j") // MySQL 드라이버 (필수 변경)
    testRuntimeOnly("com.h2database:h2") // 테스트용 인메모리 DB

    // 3. Utils
    compileOnly("org.projectlombok:lombok")
    annotationProcessor("org.projectlombok:lombok")
    implementation("org.modelmapper:modelmapper:3.1.1")
    implementation("org.apache.commons:commons-lang3:3.12.0")

    // 4. API Documentation // +) Swagger (Springdoc)
    implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:2.8.5")

    // Spring Security 의존성 추가 (로그인 처리)
    implementation("org.springframework.boot:spring-boot-starter-security")
    // JWT 라이브러리도 필요함 (예: jjwt)
    implementation("io.jsonwebtoken:jjwt-api:0.11.5")
    runtimeOnly("io.jsonwebtoken:jjwt-impl:0.11.5")
    runtimeOnly("io.jsonwebtoken:jjwt-jackson:0.11.5")
    
    // Redis 추가
    implementation("org.springframework.boot:spring-boot-starter-data-redis")

    // Excel export (Apache POI - SXSSF 스트리밍 지원)
    implementation("org.apache.poi:poi-ooxml:5.2.5")

    // 5. Test
    testImplementation("org.springframework.boot:spring-boot-starter-test")
}

tasks.withType<Test> {
    useJUnitPlatform()
}