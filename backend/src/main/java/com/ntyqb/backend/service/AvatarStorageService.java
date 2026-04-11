package com.ntyqb.backend.service;

import com.ntyqb.backend.exception.BadRequestException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Set;
import java.util.UUID;

@Service
public class AvatarStorageService {

    private static final Set<String> ALLOWED_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp"
    );

    private final Path avatarsDirectory;

    public AvatarStorageService(@Value("${app.upload.root-dir:./data/uploads}") String uploadRootDir) {
        this.avatarsDirectory = Path.of(uploadRootDir).toAbsolutePath().normalize().resolve("avatars");
    }

    public String store(MultipartFile file) {
        validate(file);
        try {
            Files.createDirectories(avatarsDirectory);
            String extension = resolveExtension(file);
            String filename = UUID.randomUUID() + extension;
            Path destination = avatarsDirectory.resolve(filename).normalize();
            try (InputStream inputStream = file.getInputStream()) {
                Files.copy(inputStream, destination, StandardCopyOption.REPLACE_EXISTING);
            }
            return "/api/uploads/avatars/" + filename;
        } catch (IOException exception) {
            throw new BadRequestException("头像上传失败，请稍后重试");
        }
    }

    private void validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("请先选择微信头像");
        }
        if (!ALLOWED_TYPES.contains(file.getContentType())) {
            throw new BadRequestException("头像仅支持 jpg、png、webp");
        }
    }

    private String resolveExtension(MultipartFile file) {
        String originalFilename = StringUtils.hasText(file.getOriginalFilename()) ? file.getOriginalFilename() : "";
        String extension = StringUtils.getFilenameExtension(originalFilename);
        if (StringUtils.hasText(extension)) {
            return "." + extension.toLowerCase();
        }
        return switch (file.getContentType()) {
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            default -> ".jpg";
        };
    }
}
