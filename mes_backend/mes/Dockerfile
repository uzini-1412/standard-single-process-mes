# Build stage
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
COPY . .
RUN chmod +x gradlew && ./gradlew bootJar -x test --no-daemon

# Production stage
FROM eclipse-temurin:21-jre
WORKDIR /app
ENV TZ=Asia/Seoul
COPY --from=build /app/build/libs/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "-Xms512m", "-Xmx1536m", "-Dfile.encoding=UTF-8", "-Duser.timezone=Asia/Seoul", "-Dspring.profiles.active=prod", "app.jar"]
