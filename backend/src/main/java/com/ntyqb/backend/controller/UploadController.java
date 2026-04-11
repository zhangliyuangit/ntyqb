package com.ntyqb.backend.controller;

import com.ntyqb.backend.dto.AuthDtos;
import com.ntyqb.backend.service.AvatarStorageService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

@RestController
@RequestMapping("/api/uploads")
public class UploadController {

    private final AvatarStorageService avatarStorageService;
    private final String publicBaseUrl;

    public UploadController(
            AvatarStorageService avatarStorageService,
            @Value("${app.upload.public-base-url:}") String publicBaseUrl
    ) {
        this.avatarStorageService = avatarStorageService;
        this.publicBaseUrl = publicBaseUrl;
    }

    @PostMapping("/avatar")
    public AuthDtos.AvatarUploadResponse uploadAvatar(
            @RequestParam("file") MultipartFile file,
            HttpServletRequest request
    ) {
        String relativePath = avatarStorageService.store(file);
        return new AuthDtos.AvatarUploadResponse(buildPublicUrl(request, relativePath));
    }

    private String buildPublicUrl(HttpServletRequest request, String relativePath) {
        if (StringUtils.hasText(publicBaseUrl)) {
            return publicBaseUrl.replaceAll("/$", "") + relativePath;
        }
        return ServletUriComponentsBuilder.fromRequestUri(request)
                .replacePath(relativePath)
                .replaceQuery(null)
                .build()
                .toUriString();
    }
}
