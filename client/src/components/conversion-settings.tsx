import { Settings, Info } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ConversionSettings {
  quality: number;
  sampleRate: number;
}

interface ConversionSettingsProps {
  settings: ConversionSettings;
  onSettingsChange: (settings: ConversionSettings) => void;
}

export default function ConversionSettings({ settings, onSettingsChange }: ConversionSettingsProps) {
  const handleQualityChange = (value: string) => {
    onSettingsChange({
      ...settings,
      quality: parseInt(value),
    });
  };

  const handleSampleRateChange = (value: string) => {
    onSettingsChange({
      ...settings,
      sampleRate: parseInt(value),
    });
  };

  return (
    <div className="mt-12 bg-card rounded-lg border border-border p-6" data-testid="conversion-settings">
      <h3 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
        <Settings className="w-5 h-5 text-muted-foreground" />
        Conversion Settings
      </h3>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="quality" className="block text-sm font-medium text-foreground mb-2">
            Audio Quality
          </Label>
          <Select value={settings.quality.toString()} onValueChange={handleQualityChange}>
            <SelectTrigger data-testid="select-quality">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="96">96 kbps (Smaller file)</SelectItem>
              <SelectItem value="128">128 kbps (Recommended)</SelectItem>
              <SelectItem value="160">160 kbps (Higher quality)</SelectItem>
              <SelectItem value="192">192 kbps (Best quality)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="sampleRate" className="block text-sm font-medium text-foreground mb-2">
            Sample Rate
          </Label>
          <Select value={settings.sampleRate.toString()} onValueChange={handleSampleRateChange}>
            <SelectTrigger data-testid="select-sample-rate">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="22050">22.05 kHz (Voice)</SelectItem>
              <SelectItem value="44100">44.1 kHz (CD Quality)</SelectItem>
              <SelectItem value="48000">48 kHz (Professional)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-4 p-3 bg-muted rounded-lg">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-muted-foreground mt-0.5" />
          <p className="text-sm text-muted-foreground">
            Files are automatically converted from stereo to mono and compressed to OGG format.
            Conversion typically reduces file size by 40-60% while maintaining good audio quality.
          </p>
        </div>
      </div>
    </div>
  );
}
