package com.xadazhii.backend.service;

import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.data.embedding.Embedding; // Перевірте імпорт
import dev.langchain4j.rag.content.Content;
import dev.langchain4j.rag.content.retriever.ContentRetriever;
import dev.langchain4j.rag.query.Query;
import dev.langchain4j.store.embedding.EmbeddingMatch;
import dev.langchain4j.store.embedding.EmbeddingStore;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.List;
import java.util.stream.Collectors;

public class ChatAwareContentRetriever implements ContentRetriever {

    private static final Logger logger = LoggerFactory.getLogger(ChatAwareContentRetriever.class);

    private final EmbeddingStore<TextSegment> embeddingStore;
    private final EmbeddingModel embeddingModel;
    private final int maxResults;
    private final double minScore;
    private final String chatId;

    public ChatAwareContentRetriever(EmbeddingStore<TextSegment> embeddingStore,
                                     EmbeddingModel embeddingModel,
                                     String chatId,
                                     int maxResults,
                                     double minScore) {
        this.embeddingStore = embeddingStore;
        this.embeddingModel = embeddingModel;
        this.chatId = chatId;
        this.maxResults = maxResults;
        this.minScore = minScore;
    }

    @Override
    public List<Content> retrieve(Query query) {
        logger.info("🔍 RETRIEVING for ChatID: '{}' | Query: '{}'", chatId, query.text());

        Embedding queryEmbedding = embeddingModel.embed(query.text()).content();

        List<EmbeddingMatch<TextSegment>> matches = embeddingStore.findRelevant(
                queryEmbedding,
                maxResults * 100,
                minScore
        );

        logger.info("📊 Database found {} potential candidates (before filter)", matches.size());

        List<Content> filteredContent = matches.stream()
                .filter(match -> {
                    TextSegment segment = match.embedded();
                    if (segment == null || segment.metadata() == null) return false;

                    String segmentChatId = segment.metadata().getString("chatId");
                    return chatId.equals(segmentChatId);
                })
                .limit(maxResults)
                .map(EmbeddingMatch::embedded)
                .map(Content::from)
                .collect(Collectors.toList());

        logger.info("✅ FINAL: Found {} relevant segments for THIS chat.", filteredContent.size());

        return filteredContent;
    }
}