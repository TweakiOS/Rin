import Lightbox, { SlideImage } from "yet-another-react-lightbox";
import Counter from "yet-another-react-lightbox/plugins/counter";
import Download from "yet-another-react-lightbox/plugins/download";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";

export interface MarkdownLightboxProps {
  index: number;
  slides: SlideImage[] | undefined;
  onClose: () => void;
}

/**
 * The image lightbox is only needed once a reader clicks an image, so it is
 * split into its own chunk instead of sitting in the entry bundle.
 */
export default function MarkdownLightbox({ index, slides, onClose }: MarkdownLightboxProps) {
  return (
    <Lightbox
      plugins={[Download, Zoom, Counter]}
      index={index}
      slides={slides}
      open={index >= 0}
      close={onClose}
    />
  );
}
