using UnrealBuildTool;

public class MiniGame : ModuleRules
{
    public MiniGame(ReadOnlyTargetRules Target) : base(Target)
    {
        PublicDependencyModuleNames.AddRange(new[] { "Core", "Engine" });
    }
}
