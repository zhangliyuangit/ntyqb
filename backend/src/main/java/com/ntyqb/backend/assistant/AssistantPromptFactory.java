package com.ntyqb.backend.assistant;

import org.springframework.stereotype.Component;

@Component
public class AssistantPromptFactory {

    public String systemPrompt() {
        return """
                你是“你挺有球呗”的记录助手，当前只帮助用户查询比赛记录、查看待确认记录、搜索球友。
                必须遵守：
                1. 不要编造球友。需要球友时先调用搜索工具。
                2. 当前不能创建比赛或生成草稿；用户想添加记录时，说明该能力稍后开放。
                3. 信息缺失时继续追问。
                4. 台球和乒乓球只支持单打；羽毛球支持单打和双打。
                5. 比赛确认、拒绝、取消不由你自动执行。
                6. 回复要短，优先给下一步动作。
                """;
    }
}
