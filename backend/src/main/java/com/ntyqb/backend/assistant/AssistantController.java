package com.ntyqb.backend.assistant;

import com.ntyqb.backend.entity.User;
import com.ntyqb.backend.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/assistant")
public class AssistantController {

    private final AuthService authService;
    private final AssistantService assistantService;

    public AssistantController(AuthService authService, AssistantService assistantService) {
        this.authService = authService;
        this.assistantService = assistantService;
    }

    @PostMapping("/chat")
    public AssistantDtos.ChatResponse chat(@Valid @RequestBody AssistantDtos.ChatRequest request) {
        User user = authService.requireCurrentUser();
        return assistantService.chat(request, user);
    }

    @PostMapping("/actions/{actionId}/confirm")
    public AssistantDtos.ConfirmActionResponse confirmAction(@PathVariable String actionId) {
        User user = authService.requireCurrentUser();
        return assistantService.confirmAction(actionId, user);
    }
}
