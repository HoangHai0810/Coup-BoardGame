package com.boardgame.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.jdbc.DataSourceBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;

@Configuration
public class DataSourceConfig {

    @Value("${spring.datasource.url}")
    private String dbUrl;

    @Value("${spring.datasource.username}")
    private String username;

    @Value("${spring.datasource.password}")
    private String password;

    @Value("${spring.datasource.driver-class-name}")
    private String driverClassName;

    @Bean
    @Primary
    public DataSource dataSource() {
        String fixedUrl = dbUrl;
        // If the URL starts with postgresql:// (Render's default), prepend jdbc:
        if (dbUrl != null && dbUrl.startsWith("postgresql://")) {
            fixedUrl = "jdbc:" + dbUrl;
        }
        
        return DataSourceBuilder.create()
                .url(fixedUrl)
                .username(username)
                .password(password)
                .driverClassName(driverClassName)
                .build();
    }
}
