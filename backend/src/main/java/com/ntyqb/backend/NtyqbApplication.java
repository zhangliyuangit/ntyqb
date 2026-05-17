package com.ntyqb.backend;

import com.ntyqb.backend.assistant.AssistantProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties(AssistantProperties.class)
public class NtyqbApplication {

    public static void main(String[] args) {
        SpringApplication.run(NtyqbApplication.class, args);
    }
}
